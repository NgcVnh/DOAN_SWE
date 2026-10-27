import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ValidatePromotionDto {
  @IsString({ message: 'Mã khuyến mãi phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã khuyến mãi không được để trống' })
  code: string;

  @IsInt({ message: 'Giá trị đơn hàng phải là số nguyên' })
  @Min(0, { message: 'Giá trị đơn hàng không được âm' })
  subtotal: number;
}
