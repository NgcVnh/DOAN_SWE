import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from './enums/order-status.enum.js';

const allowedTransitions: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.PAID]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED
  ],

  [OrderStatus.PREPARING]: [
    OrderStatus.READY,
  ],

  [OrderStatus.READY]: [
    OrderStatus.COMPLETED,
  ],

  [OrderStatus.COMPLETED]: [],

  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAID,
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.CANCELLED]: [],
};

export function canTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }
  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

export function assertTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): void {
  if (!canTransition(currentStatus, nextStatus)) {
    throw new BadRequestException(
      `Không thể chuyển trạng thái đơn hàng từ "${currentStatus}" sang "${nextStatus}". Chuyển tiếp không hợp lệ!`,
    );
  }
}
