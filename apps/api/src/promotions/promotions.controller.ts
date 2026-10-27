import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';
import { LoyaltyPointsService, LOYALTY_CONSTANTS } from './loyalty.service.js';
import { ValidatePromotionDto } from './dto/validate-promotion.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly loyaltyService: LoyaltyPointsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Lấy danh sách các mã khuyến mãi công khai đang có hiệu lực
   */
  @Get()
  async getAvailablePromotions() {
    const list = await this.promotionsService.getAvailablePromotions();
    return list.map((item) => ({
      id: item.id,
      code: item.code,
      discountType: item.discountType,
      discountValue: item.discountValue,
      minOrderValue: item.minOrderValue,
      maxDiscount: item.maxDiscount,
      expiredAt: item.expiredAt,
    }));
  }

  /**
   * Kiểm tra tính hợp lệ của mã khuyến mãi và tính trước số tiền giảm
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validatePromotion(@Body() dto: ValidatePromotionDto) {
    const result = await this.promotionsService.validateAndCalculate(
      dto.code,
      dto.subtotal,
    );

    return {
      valid: true,
      code: result.promotion.code,
      discountType: result.promotion.discountType,
      discountValue: result.promotion.discountValue,
      discountAmount: result.discountAmount,
      subtotal: result.subtotal,
      finalTotal: result.finalTotal,
    };
  }

  /**
   * Tra cứu thông tin điểm thưởng của khách hàng hiện tại
   */
  @Get('loyalty/me')
  @UseGuards(JwtAuthGuard)
  async getMyLoyaltySummary(@CurrentUser() user: any) {
    const userId = Number(user?.id ?? user?.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Người dùng không hợp lệ');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, loyaltyPoints: true },
    });

    const points = dbUser?.loyaltyPoints ?? 0;
    return {
      userId,
      points,
      pointValueInVnd: LOYALTY_CONSTANTS.POINT_VALUE_IN_VND,
      equivalentDiscountVnd: points * LOYALTY_CONSTANTS.POINT_VALUE_IN_VND,
      spendPerEarnedPoint: LOYALTY_CONSTANTS.VND_PER_EARNED_POINT,
    };
  }
}
