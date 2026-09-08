import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateStaffDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    avatar?: string;

    @IsString()
    @IsOptional()
    password?: string;
}
