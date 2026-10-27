import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export const LOYALTY_CONSTANTS = {
  POINT_VALUE_IN_VND: 1000,
  VND_PER_EARNED_POINT: 10000,
};

@Injectable()
export class LoyaltyPointsService {
  constructor(private readonly prisma: PrismaService) {}

  calculatePointsEarned(paidAmount: number): number {
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return 0;
    }
    return Math.floor(paidAmount / LOYALTY_CONSTANTS.VND_PER_EARNED_POINT);
  }

  /**
   * Tính toán số tiền được giảm khi khách hàng dùng điểm thưởng
   * @param pointsToUse Số điểm khách hàng yêu cầu sử dụng
   * @param maxAllowedDiscount Số tiền tối đa còn lại của đơn hàng có thể giảm
   * @param userAvailablePoints Số điểm hiện có trong tài khoản của khách hàng
   */
  calculatePointsDiscount(
    pointsToUse: number,
    maxAllowedDiscount: number,
    userAvailablePoints: number,
  ): { discountAmount: number; pointsActuallyUsed: number } {
    if (!pointsToUse || pointsToUse <= 0) {
      return { discountAmount: 0, pointsActuallyUsed: 0 };
    }

    if (!Number.isInteger(pointsToUse)) {
      throw new BadRequestException('Số điểm sử dụng phải là số nguyên dương');
    }

    if (pointsToUse > userAvailablePoints) {
      throw new BadRequestException(
        `Số điểm sử dụng (${pointsToUse} điểm) vượt quá số điểm khả dụng của bạn (${userAvailablePoints} điểm)`,
      );
    }

    const potentialDiscount = pointsToUse * LOYALTY_CONSTANTS.POINT_VALUE_IN_VND;

    if (potentialDiscount > maxAllowedDiscount) {
      const discountAmount = Math.max(0, maxAllowedDiscount);
      const pointsActuallyUsed = Math.ceil(discountAmount / LOYALTY_CONSTANTS.POINT_VALUE_IN_VND);
      return { discountAmount, pointsActuallyUsed };
    }

    return {
      discountAmount: potentialDiscount,
      pointsActuallyUsed: pointsToUse,
    };
  }

  async deductPointsInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    pointsToDeduct: number,
  ): Promise<void> {
    if (pointsToDeduct <= 0) return;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });

    if (!user || user.loyaltyPoints < pointsToDeduct) {
      throw new BadRequestException('Tài khoản không đủ điểm thưởng để thực hiện giao dịch');
    }

    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { decrement: pointsToDeduct } },
    });
  }

  async addPointsInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    pointsToAdd: number,
  ): Promise<void> {
    if (pointsToAdd <= 0) return;

    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: pointsToAdd } },
    });
  }
}
