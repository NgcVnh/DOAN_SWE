import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, Prisma, Promotion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiscountStrategy } from './strategies/discount-strategy.interface.js';
import { PercentageDiscountStrategy } from './strategies/percentage-discount.strategy.js';
import { FixedDiscountStrategy } from './strategies/fixed-discount.strategy.js';

export interface PromotionValidationResult {
  promotion: Promotion;
  discountAmount: number;
  subtotal: number;
  finalTotal: number;
}

/**
 * [OOP & SOLID - Dependency Injection & Strategy Pattern]
 * Quản lý vòng đời, kiểm tra điều kiện và tính toán khuyến mãi cho đơn hàng.
 */
@Injectable()
export class PromotionsService {
  private readonly strategies: Record<DiscountType, DiscountStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly percentageStrategy: PercentageDiscountStrategy,
    private readonly fixedStrategy: FixedDiscountStrategy,
  ) {
    // Ánh xạ DiscountType enum sang Strategy tương ứng (Đa hình Polymorphism)
    this.strategies = {
      [DiscountType.PERCENTAGE]: this.percentageStrategy,
      [DiscountType.FIXED]: this.fixedStrategy,
    };
  }

  /**
   * Kiểm tra điều kiện áp dụng và tính toán số tiền giảm giá của mã khuyến mãi
   */
  async validateAndCalculate(
    code: string,
    subtotal: number,
  ): Promise<PromotionValidationResult> {
    const cleanCode = code ? code.trim().toUpperCase() : '';
    if (!cleanCode) {
      throw new BadRequestException('Mã khuyến mãi không được để trống');
    }

    if (subtotal < 0) {
      throw new BadRequestException('Giá trị đơn hàng không hợp lệ');
    }

    const promotion = await this.prisma.promotion.findUnique({
      where: { code: cleanCode },
    });

    if (!promotion) {
      throw new NotFoundException(`Mã khuyến mãi "${cleanCode}" không tồn tại trong hệ thống`);
    }

    // 1. Kiểm tra trạng thái kích hoạt
    if (!promotion.isActive) {
      throw new BadRequestException(`Mã khuyến mãi "${cleanCode}" hiện đang tạm ngừng áp dụng`);
    }

    // 2. Kiểm tra ngày hết hạn
    if (promotion.expiredAt && new Date() > new Date(promotion.expiredAt)) {
      throw new BadRequestException(`Mã khuyến mãi "${cleanCode}" đã hết hạn sử dụng`);
    }

    // 3. Kiểm tra giới hạn số lượt sử dụng
    if (
      promotion.usageLimit !== null &&
      promotion.usageLimit !== undefined &&
      promotion.usedCount >= promotion.usageLimit
    ) {
      throw new BadRequestException(`Mã khuyến mãi "${cleanCode}" đã đạt giới hạn lượt sử dụng`);
    }

    // 4. Kiểm tra giá trị đơn hàng tối thiểu
    if (subtotal < promotion.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng cần đạt tối thiểu ${promotion.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này`,
      );
    }

    // 5. Tính toán giảm giá theo chiến lược (Strategy Pattern)
    const strategy = this.strategies[promotion.discountType];
    if (!strategy) {
      throw new BadRequestException(`Loại khuyến mãi "${promotion.discountType}" chưa được hỗ trợ`);
    }

    const discountAmount = strategy.calculateDiscount({
      subtotal,
      discountValue: promotion.discountValue,
      maxDiscount: promotion.maxDiscount,
    });

    const finalTotal = Math.max(0, subtotal - discountAmount);

    return {
      promotion,
      discountAmount,
      subtotal,
      finalTotal,
    };
  }

  /**
   * Cập nhật số lượt sử dụng mã khuyến mãi trong transaction an toàn
   */
  async recordUsageInTransaction(
    tx: Prisma.TransactionClient,
    promotionId: number,
  ): Promise<void> {
    await tx.promotion.update({
      where: { id: promotionId },
      data: { usedCount: { increment: 1 } },
    });
  }

  /**
   * Lấy danh sách các mã khuyến mãi đang có hiệu lực
   */
  async getAvailablePromotions(): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        expiredAt: { gt: new Date() },
      },
      orderBy: { minOrderValue: 'asc' },
    });
  }
}
