import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LoyaltyPointsService } from './loyalty.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('LoyaltyPointsService (Task 10.3 - Quý)', () => {
  let loyaltyService: LoyaltyPointsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    loyaltyService = new LoyaltyPointsService(prismaMock as unknown as PrismaService);
  });

  describe('calculatePointsEarned (Quy tắc tích điểm)', () => {
    it('tích lũy 1 điểm cho mỗi 10.000 VNĐ chi tiêu thực tế', () => {
      expect(loyaltyService.calculatePointsEarned(100000)).toBe(10);
      expect(loyaltyService.calculatePointsEarned(125000)).toBe(12);
      expect(loyaltyService.calculatePointsEarned(39000)).toBe(3);
    });

    it('trả về 0 điểm nếu số tiền thanh toán dưới 10.000 VNĐ hoặc nhỏ hơn/bằng 0', () => {
      expect(loyaltyService.calculatePointsEarned(9000)).toBe(0);
      expect(loyaltyService.calculatePointsEarned(0)).toBe(0);
      expect(loyaltyService.calculatePointsEarned(-50000)).toBe(0);
    });
  });

  describe('calculatePointsDiscount (Quy tắc tiêu điểm giảm giá)', () => {
    it('trả về 0đ khi pointsToUse bằng 0 hoặc không truyền', () => {
      const result = loyaltyService.calculatePointsDiscount(0, 100000, 50);
      expect(result.discountAmount).toBe(0);
      expect(result.pointsActuallyUsed).toBe(0);
    });

    it('ném lỗi BadRequestException nếu điểm sử dụng vượt quá điểm tài khoản đang có', () => {
      expect(() => {
        loyaltyService.calculatePointsDiscount(60, 100000, 50); // Muốn dùng 60 nhưng chỉ có 50
      }).toThrow(BadRequestException);
    });

    it('ném lỗi nếu pointsToUse không phải là số nguyên', () => {
      expect(() => {
        loyaltyService.calculatePointsDiscount(10.5, 100000, 50);
      }).toThrow(BadRequestException);
    });

    it('quy đổi chính xác điểm thành tiền (1 điểm = 1.000 VNĐ)', () => {
      const result = loyaltyService.calculatePointsDiscount(25, 100000, 50);
      expect(result.discountAmount).toBe(25000);
      expect(result.pointsActuallyUsed).toBe(25);
    });

    it('giới hạn giảm giá không vượt quá số tiền còn lại của đơn hàng và chỉ trừ lượng điểm tương ứng', () => {
      // Đơn hàng chỉ còn 15.000đ nhưng người dùng chọn dùng 30 điểm (= 30.000đ)
      const result = loyaltyService.calculatePointsDiscount(30, 15000, 50);
      expect(result.discountAmount).toBe(15000);
      expect(result.pointsActuallyUsed).toBe(15); // Chỉ trừ 15 điểm thay vì trừ cả 30 điểm
    });
  });

  describe('deductPointsInTransaction (Khấu trừ điểm trong transaction)', () => {
    it('ném lỗi BadRequestException nếu tài khoản không đủ điểm trong DB', async () => {
      const txMock: any = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 1, loyaltyPoints: 5 }),
        },
      };

      await expect(
        loyaltyService.deductPointsInTransaction(txMock, 1, 20),
      ).rejects.toThrow(BadRequestException);
    });

    it('khấu trừ điểm thành công nếu tài khoản đủ điểm', async () => {
      const txMock: any = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 1, loyaltyPoints: 50 }),
          update: vi.fn().mockResolvedValue({ id: 1, loyaltyPoints: 30 }),
        },
      };

      await loyaltyService.deductPointsInTransaction(txMock, 1, 20);
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { loyaltyPoints: { decrement: 20 } },
      });
    });
  });

  describe('addPointsInTransaction (Cộng điểm trong transaction)', () => {
    it('cộng điểm tích lũy thành công', async () => {
      const txMock: any = {
        user: {
          update: vi.fn().mockResolvedValue({ id: 1, loyaltyPoints: 25 }),
        },
      };

      await loyaltyService.addPointsInTransaction(txMock, 1, 10);
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { loyaltyPoints: { increment: 10 } },
      });
    });
  });
});
