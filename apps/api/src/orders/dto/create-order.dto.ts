import {
  IsArray,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DrinkSize } from '../enums/order-status.enum.js';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1, { message: 'Số lượng sản phẩm phải lớn hơn hoặc bằng 1' })
  quantity: number;

  @IsEnum(DrinkSize, { message: 'Size phải là S, M hoặc L' })
  size: DrinkSize;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toppings?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsToUse?: number;
}

