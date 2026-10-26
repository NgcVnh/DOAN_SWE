import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { DrinkSize } from './enums/order-status.enum.js';
import { PercentageDiscountStrategy } from '../promotions/strategies/percentage-discount.strategy.js';
import { FixedDiscountStrategy } from '../promotions/strategies/fixed-discount.strategy.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { LoyaltyPointsService } from '../promotions/loyalty.service.js';
import { DiscountType } from '@prisma/client';

describe('OrdersService - Pricing, Promotions & Loyalty Points (Task 10.3)', () => {
  let ordersService: OrdersService;
  let prismaMock: any;
  let promotionsService: PromotionsService;
  let loyaltyService: LoyaltyPointsService;

  beforeEach(() => {
    prismaMock = {
      product: {
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      promotion: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      order: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return cb(prismaMock);
      }),
    };

    const percentageStrategy = new PercentageDiscountStrategy();
    const fixedStrategy = new FixedDiscountStrategy();

    promotionsService = new PromotionsService(
      prismaMock,
      percentageStrategy,
      fixedStrategy,
    );
    loyaltyService = new LoyaltyPointsService(prismaMock);

    ordersService = new OrdersService(
      prismaMock,
      promotionsService,
      loyaltyService,
    );
  });

  it('tạo đơn hàng cơ bản: tính đúng subtotal theo size, topping và điểm tích lũy', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 1, price: 35000 },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      loyaltyPoints: 0,
    });
    prismaMock.order.create.mockImplementation(({ data }) => ({
      id: 101,
      userId: data.userId,
      status: data.status,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      total: data.total,
      pointsEarned: data.pointsEarned,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          productId: 1,
          size: DrinkSize.M,
          toppings: ['Trân châu'],
          qty: 2,
        },
      ],
    }));

    // Giá: 35k (base) + 5k (size M) + 5k (topping) = 45k x 2 ly = 90.000đ
    const result = await ordersService.createOrder(
      {
        items: [
          {
            productId: '1',
            quantity: 2,
            size: DrinkSize.M,
            toppings: ['Trân châu'],
          },
        ],
      },
      1,
    );

    expect(result.subtotal).toBe(90000);
    expect(result.discountAmount).toBe(0);
    expect(result.totalAmount).toBe(90000);
    // 90.000đ tích được 9 điểm
    expect(result.pointsEarned).toBe(9);
  });

  it('áp dụng mã giảm giá 20% và dùng 10 điểm thưởng (10k) trên cùng đơn hàng', async () => {
    // 2 món: 1 ly 50k, 1 ly 50k = 100k subtotal
    prismaMock.product.findMany.mockResolvedValue([
      { id: 1, price: 50000 },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      loyaltyPoints: 50, // User có 50 điểm
    });

    // Mock voucher 20% (max 30k)
    prismaMock.promotion.findUnique.mockResolvedValue({
      id: 1,
      code: 'BREWLITE20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderValue: 50000,
      maxDiscount: 30000,
      usageLimit: 100,
      usedCount: 0,
      isActive: true,
      expiredAt: new Date(Date.now() + 86400000),
    });

    prismaMock.order.create.mockImplementation(({ data }) => ({
      id: 102,
      userId: data.userId,
      status: data.status,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      total: data.total,
      pointsEarned: data.pointsEarned,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [{ productId: 1, size: DrinkSize.S, toppings: [], qty: 2 }],
    }));

    const result = await ordersService.createOrder(
      {
        items: [{ productId: '1', quantity: 2, size: DrinkSize.S }],
        promoCode: 'BREWLITE20',
        pointsToUse: 10, // Dùng 10 điểm = 10.000đ
      },
      1,
    );

    // Subtotal: 100.000đ
    // Voucher 20%: -20.000đ
    // Điểm thưởng (10 điểm): -10.000đ
    // Tổng giảm: 30.000đ
    // Còn lại: 70.000đ
    // Điểm tích lũy: 7 điểm
    expect(result.subtotal).toBe(100000);
    expect(result.discountAmount).toBe(30000);
    expect(result.totalAmount).toBe(70000);
    expect(result.pointsEarned).toBe(7);

    // Kiểm tra trừ 10 điểm của user trong transaction
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { loyaltyPoints: { decrement: 10 } },
    });

    // Kiểm tra tăng lượt dùng voucher
    expect(prismaMock.promotion.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { usedCount: { increment: 1 } },
    });
  });

  it('từ chối tạo đơn nếu người dùng gian lận nhập điểm vượt quá số điểm sở hữu', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: 1, price: 50000 }]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      loyaltyPoints: 5, // Chỉ có 5 điểm
    });

    await expect(
      ordersService.createOrder(
        {
          items: [{ productId: '1', quantity: 1, size: DrinkSize.S }],
          pointsToUse: 20, // Đòi dùng 20 điểm
        },
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
