import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';

/**
 * [OOP - Module Encapsulation]
 * AuthModule đóng gói toàn bộ tính năng xác thực JWT, Passport và Controller/Service liên quan.
 */
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'brewlite_jwt_secret_key_2026',
      signOptions: {
        expiresIn: '1d', // Token hết hạn sau 1 ngày (24 giờ)
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}

