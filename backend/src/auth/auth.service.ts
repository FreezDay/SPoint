import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        let passwordOk = false;
        if (user && user.password) {
            try {
                passwordOk = await bcrypt.compare(pass, user.password);
            } catch {
                passwordOk = false;
            }
        }
        if (user && passwordOk) {
            if (user.role === 'CLIENT') {
                user.role = 'STAFF';
                await this.usersService.update(user.id, { role: 'STAFF' });
            }
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    async register(createUserDto: CreateUserDto) {
        const user = await this.usersService.create({
            ...createUserDto,
            role: 'ADMIN',
        });
        return this.login(user);
    }

    async socialLogin(profile: any) {
        let user = await this.usersService.findOne(profile.email);
        if (!user) {
            user = await this.usersService.create({
                email: profile.email,
                name: profile.name,
                password: Math.random().toString(36).slice(-10), // Random pass for social users
                role: 'ADMIN',
            });
        }
        return this.login(user);
    }

    async updateProfile(id: string, data: Pick<UpdateUserDto, 'name' | 'password' | 'avatar'>) {
        const user = await this.usersService.update(id, data);
        const { password, ...safeUser } = user;
        return safeUser;
    }
}
