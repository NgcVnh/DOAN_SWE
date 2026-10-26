import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

/**
 * [OOP - Single Responsibility Principle]
 * AuthService đảm nhận toàn bộ nghiệp vụ logic xác thực:
 * - Đăng ký tài khoản mới (băm mật khẩu, chống trùng email).
 * - Đăng nhập tài khoản (so sánh hash, phát hành JWT token).
 * - Hỗ trợ In-Memory Fallback khi CSDL PostgreSQL ngoại tuyến.
 */
@Injectable()
export class AuthService {
  // Bộ nhớ in-memory lưu trữ người dùng khi PostgreSQL chưa được bật
  private readonly inMemoryUsersByEmail = new Map<string, any>();
  private readonly inMemoryUsersById = new Map<number, any>();
  private nextUserId = 1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Đăng ký tài khoản mới
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Nếu CSDL PostgreSQL đang kết nối
    if (this.prisma?.isConnected) {
      try {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          throw new ConflictException('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: passwordHash,
            fullName: dto.fullName?.trim() || null,
            loyaltyPoints: 0,
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            loyaltyPoints: true,
            createdAt: true,
          },
        });

        return {
          success: true,
          message: 'Đăng ký tài khoản thành công',
          user,
        };
      } catch (error: any) {
        if (error instanceof ConflictException) throw error;
        // Nếu lỗi kết nối CSDL, tự động chuyển xuống In-Memory Fallback
      }
    }

    // 2. Chế độ In-Memory an toàn (khi DB PostgreSQL chưa khởi động)
    if (this.inMemoryUsersByEmail.has(normalizedEmail)) {
      throw new ConflictException('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);
    const userId = this.nextUserId++;

    const user = {
      id: userId,
      email: normalizedEmail,
      fullName: dto.fullName?.trim() || null,
      passwordHash,
      loyaltyPoints: 0,
      createdAt: new Date(),
    };

    this.inMemoryUsersByEmail.set(normalizedEmail, user);
    this.inMemoryUsersById.set(userId, user);

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        loyaltyPoints: user.loyaltyPoints,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Đăng nhập tài khoản và cấp phát JWT token
   */
  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const invalidCredentialsMsg = 'Email hoặc mật khẩu không chính xác';

    let user: any = null;

    if (this.prisma?.isConnected) {
      try {
        user = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
      } catch {
        user = null;
      }
    }

    if (!user) {
      user = this.inMemoryUsersByEmail.get(normalizedEmail);
    }

    if (!user) {
      throw new UnauthorizedException(invalidCredentialsMsg);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(invalidCredentialsMsg);
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Đăng nhập thành công',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        loyaltyPoints: user.loyaltyPoints ?? 0,
      },
    };
  }

  /**
   * Lấy thông tin tài khoản hiện tại từ Token
   */
  async getProfile(userId: number | string) {
    const numericId = Number(userId);

    if (this.prisma?.isConnected) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: numericId },
          select: {
            id: true,
            email: true,
            fullName: true,
            loyaltyPoints: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (user) return user;
      } catch {
        // Fallback
      }
    }

    const memUser = this.inMemoryUsersById.get(numericId);
    if (!memUser) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    return {
      id: memUser.id,
      email: memUser.email,
      fullName: memUser.fullName,
      loyaltyPoints: memUser.loyaltyPoints ?? 0,
      createdAt: memUser.createdAt,
      updatedAt: memUser.createdAt,
    };
  }
}
