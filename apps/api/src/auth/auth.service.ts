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
 * - Đóng gói dữ liệu an toàn, không trả về mật khẩu nhạy cảm.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Đăng ký tài khoản mới
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Kiểm tra email đã tồn tại trong hệ thống chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
    }

    // 2. Băm mật khẩu bằng bcryptjs với salt rounds = 10
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    try {
      // 3. Tạo tài khoản trong cơ sở dữ liệu
      // Chỉ lưu các trường cần thiết, client không thể gán quyền hay role ngoài ý muốn
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
    } catch {
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình tạo tài khoản');
    }
  }

  /**
   * Đăng nhập tài khoản và cấp phát JWT token
   */
  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Tìm người dùng theo email
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Thông báo lỗi chung, không phân biệt "sai email" hay "sai password" để tránh user enumeration
    const invalidCredentialsMsg = 'Email hoặc mật khẩu không chính xác';

    if (!user) {
      throw new UnauthorizedException(invalidCredentialsMsg);
    }

    // 2. So sánh mật khẩu dạng thuần với passwordHash trong DB
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(invalidCredentialsMsg);
    }

    // 3. Tạo JWT payload và ký token với hạn sử dụng xác định
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // 4. Trả về thông tin an toàn (tuyệt đối KHÔNG chứa passwordHash)
    return {
      success: true,
      message: 'Đăng nhập thành công',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }

  /**
   * Lấy thông tin tài khoản hiện tại từ Token
   */
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        loyaltyPoints: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    return user;
  }
}

