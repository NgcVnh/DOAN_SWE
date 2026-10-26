import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán phải là WALLET hoặc CARD' })
  method!: PaymentMethod;

  @IsString()
  @IsNotEmpty({ message: 'idempotencyKey không được để trống' })
  idempotencyKey!: string;

  @IsOptional()
  @IsBoolean()
  mockSuccess?: boolean;
}

