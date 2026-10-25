import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * [OOP - Data Transfer Object]
 * RegisterDto đóng gói dữ liệu đăng ký tài khoản từ client.
 * Áp dụng class-validator để xác thực dữ liệu đầu vào theo chính sách nghiệp vụ.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  fullName?: string;
}

