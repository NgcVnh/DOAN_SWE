import { IsEnum, IsOptional, IsPositive, Min } from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus } from "../enums/order-status.enum.js";

export class GetMyOrdersDto{
    @IsOptional ()
    @Type(() => Number)
    @Min(1)
    page?: number =1;
    
    @IsOptional()
    @Type(() => Number)
    @IsPositive()
    limit?: number = 10;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}