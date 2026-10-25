import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface JwtPayload {
  sub: number;
  email: string;
}

/**
 * [OOP - Strategy Pattern]
 * JwtStrategy mở rộng từ PassportStrategy để xử lý xác thực Bearer Token từ header HTTP request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'brewlite_jwt_secret_key_2026',
    });
  }

  /**
   * Phương thức validate được Passport tự động gọi sau khi giải mã và kiểm tra hạn JWT thành công.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc phiên đăng nhập đã hết hạn');
    }

    return user;
  }
}

