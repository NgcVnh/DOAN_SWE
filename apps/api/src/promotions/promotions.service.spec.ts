import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiscountType, Promotion } from '@prisma/client';
import { PromotionsService } from './promotions.service.js';
import { PercentageDiscountStrategy } from './strategies/percentage-discount.strategy.js';
import { FixedDiscountStrategy } from './strategies/fixed-discount.strategy.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('PromotionsService (Task 10.3 - Quý)', () => {
  let service: PromotionsService;
  let prismaMock: any;
  let percentageStrategy: PercentageDiscountStrategy;
  let fixedStrategy: FixedDiscountStrategy;

  beforeEach(() => {
    percentageStrategy = new PercentageDiscountStrategy();
    fixedStrategy = new FixedDiscountStrategy();

    prismaMock = {
      promotion: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new PromotionsService(
      prismaMock as unknown as PrismaService,
      percentageStrategy,
      fixedStrategy,
    );
  });

  describe('validateAndCalculate (Kiểm tra và tính tiền khuyến mãi)', () => {
    it('ném lỗi BadRequestException nếu mã khuyến mãi để trống', async () => {
      await expect(service.validateAndCalculate('', 100000)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateAndCalculate('   ', 100000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ném lỗi BadRequestException nếu giá trị đơn hàng âm', async () => {
      await expect(
        service.validateAndCalculate('PROMO20', -5000),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi NotFoundException nếu mã khuyến mãi không có trong DB', async () => {
      prismaMock.promotion.findUnique.mockResolvedValue(null);

      await expect(
        service.validateAndCalculate('KHONGTONTAI', 100000),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném lỗi BadRequestException nếu mã khuyến mãi bị vô hiệu hóa (isActive = false)', async () => {
      const mockPromo: Promotion = {
        id: 1,
        code: 'PROMO_OFF',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        minOrderValue: 50000,
        maxDiscount: 30000,
        usageLimit: 100,
        usedCount: 0,
        isActive: false,
        expiredAt: new Date(Date.now() + 86400000),
      };
      prismaMock.promotion.findUnique.mockResolvedValue(mockPromo);

      await expect(
        service.validateAndCalculate('PROMO_OFF', 100000),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi BadRequestException nếu mã khuyến mãi đã hết hạn sử dụng', async () => {
      const mockPromo: Promotion = {
        id: 2,
        code: 'EXPIRED_CODE',
        discountType: DiscountType.FIXED,
        discountValue: 10000,
        minOrderValue: 40000,
        maxDiscount: null,
        usageLimit: 50,
        usedCount: 10,
        isActive: true,
        expiredAt: new Date(Date.now() - 3600000), // Đã hết hạn 1 tiếng trước
      };
      prismaMock.promotion.findUnique.mockResolvedValue(mockPromo);

      await expect(
        service.validateAndCalculate('EXPIRED_CODE', 60000),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi BadRequestException nếu mã khuyến mãi đã hết lượt sử dụng (usageLimit)', async () => {
      const mockPromo: Promotion = {
        id: 3,
        code: 'LIMIT_REACHED',
        discountType: DiscountType.FIXED,
        discountValue: 10000,
        minOrderValue: 30000,
        maxDiscount: null,
        usageLimit: 50,
        usedCount: 50, // Đã dùng hết
        isActive: true,
        expiredAt: new Date(Date.now() + 86400000),
      };
      prismaMock.promotion.findUnique.mockResolvedValue(mockPromo);

      await expect(
        service.validateAndCalculate('LIMIT_REACHED', 50000),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi BadRequestException nếu đơn hàng chưa đạt giá trị tối thiểu (minOrderValue)', async () => {
      const mockPromo: Promotion = {
        id: 4,
        code: 'MIN_VALUE_TEST',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        minOrderValue: 100000, // Cần tối thiểu 100.000đ
        maxDiscount: 25000,
        usageLimit: 100,
        usedCount: 5,
        isActive: true,
        expiredAt: new Date(Date.now() + 86400000),
      };
      prismaMock.promotion.findUnique.mockResolvedValue(mockPromo);

      await expect(
        service.validateAndCalculate('MIN_VALUE_TEST', 80000), // Chỉ mua 80.000đ
      ).rejects.toThrow(BadRequestException);
    });

    it('tính đúng số tiền giảm và tổng tiền với mã phần trăm PERCENTAGE', async () => {
      const mockPromo: Promotion = {
        id: 5,
        code: 'BREWLITE20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20, // 20%
        minOrderValue: 50000,
        maxDiscount: 30000,
        usageLimit: 100,
        usedCount: 2,
        isActive: true,
        expiredAt: new Date(Date.now() + 86400000),
      };
      prismaMock.promotion.findUnique.mockResolvedValue(mockPromo);

      const result = await service.validateAndCalculate('BREWLITE20', 100000);
      expect(result.discountAmount).toBe(20000);
      expect(result.finalTotal).toBe(80000);
      expect(result.subtotal).toBe(100000);
    });

    it('áp trần maxDiscount chuẩn xác khi giảm 20% của 200.000đ vượt mức trần 30.000đ', async () => {
      const mockPromo: Promotion = {
        id: 5,
        code: 'BREWLITE20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        minOrderValue: 50000,
        maxDiscount: 30000,
        usageLimit: 100,
        usedCount: 2,
        isActive: true,
        expiredAt: new Date(Date.now() + 86400000),
      };
      prismaMock.promotion.findUnique.mockResolvedValue(mockPromo);

      const result = await service.validateAndCalculate('BREWLITE20', 200000);
      expect(result.discountAmount).toBe(30000); // Bị trần tại 30k
      expect(result.finalTotal).toBe(170000);
    });

    it('tính đúng số tiền giảm với mã giảm tiền cố định FIXED', async () => {
      const mockPromo: Promotion = {
        id: 6,
        code: 'GIAM10K',
        discountType: DiscountType.FIXED,
        discountValue: 10000,
        minOrderValue: 40000,
        maxDiscount: null,
        usageLimit: 50,
        usedCount: 0,
        isActive: true,
        expiredAt: new Date(Date.now() + 86400000),
      };
      prismaMock.promotion.findUnique.mockResolvedValue(mockPromo);

      const result = await service.validateAndCalculate('GIAM10K', 50000);
      expect(result.discountAmount).toBe(10000);
      expect(result.finalTotal).toBe(40000);
    });
  });

  describe('recordUsageInTransaction', () => {
    it('tăng usedCount của mã khuyến mãi trong transaction', async () => {
      const txMock: any = {
        promotion: {
          update: vi.fn().mockResolvedValue({ id: 1, usedCount: 1 }),
        },
      };

      await service.recordUsageInTransaction(txMock, 1);
      expect(txMock.promotion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { usedCount: { increment: 1 } },
      });
    });
  });
});
