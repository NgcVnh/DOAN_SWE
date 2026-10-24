import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

/**
 * [OOP - Tính Đóng gói (Encapsulation)]
 * Class CreatePaymentDto đóng gói dữ liệu đầu vào của API POST /payments
 * và sử dụng Decorator của class-validator để tự động kiểm tra tính hợp lệ.
 */
export class CreatePaymentDto {
  // TODO 1: Khai báo thuộc tính orderId (kiểu number), dùng @IsInt() và @Min(1)
  @IsInt()
  @Min(1)
  orderId!: number;

  // TODO 2: Khai báo thuộc tính method (kiểu PaymentMethod: WALLET | CARD), dùng @IsEnum(PaymentMethod)
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán phải là WALLET hoặc CARD' })
  method!: PaymentMethod;

  // TODO 3: Khai báo thuộc tính idempotencyKey (kiểu string), dùng @IsString() và @IsNotEmpty()
  @IsString()
  @IsNotEmpty({ message: 'idempotencyKey không được để trống' })
  idempotencyKey!: string;

  // Thuộc tính phụ (tùy chọn) để bạn giả lập kịch bản Thanh toán Thành công / Thất bại khi demo cho giảng viên
  @IsOptional()
  @IsBoolean()
  mockSuccess?: boolean;
}

