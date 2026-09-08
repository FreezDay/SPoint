import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
    handleRequest(err, user, info) {
        // Return user if it exists, otherwise return null (instead of throwing 401)
        return user || null;
    }
}
