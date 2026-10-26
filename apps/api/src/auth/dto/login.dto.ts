import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * [OOP - Data Transfer Object]
 * LoginDto đóng gói dữ liệu đăng nhập tài khoản.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password!: string;
}

