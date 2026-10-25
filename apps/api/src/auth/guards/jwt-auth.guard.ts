import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * [OOP - Guard Pattern]
 * JwtAuthGuard bảo vệ các endpoint yêu cầu quyền đăng nhập.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

