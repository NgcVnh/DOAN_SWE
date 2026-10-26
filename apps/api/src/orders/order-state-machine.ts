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
  return allowedTransitions[currentStatus].includes(nextStatus);
}