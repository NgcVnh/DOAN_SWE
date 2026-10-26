import { OrderStatus } from './enums/order-status.enum.js';
import { canTransition, assertTransition } from './order-state-machine.js';
import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';

describe('OrderStateMachine', () => {
  it('cho phép PENDING chuyển sang PAID', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.PAID)).toBe(true);
    expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAID)).not.toThrow();
  });

  it('cho phép PENDING chuyển sang PAYMENT_FAILED', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED)).toBe(true);
    expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED)).not.toThrow();
  });

  it('cho phép PAYMENT_FAILED chuyển về PENDING (thử lại) hoặc sang CANCELLED (hủy)', () => {
    expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING)).toBe(true);
    expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PAID)).toBe(true);
    expect(() => assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED)).not.toThrow();
  });

  it('cho phép PAID chuyển sang PREPARING hoặc CANCELLED (hủy đơn)', () => {
    expect(canTransition(OrderStatus.PAID, OrderStatus.PREPARING)).toBe(true);
    expect(canTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
    expect(() => assertTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).not.toThrow();
  });

  it('Không cho phép COMPLETED chuyển sang PENDING và ném lỗi BadRequestException', () => {
    expect(canTransition(OrderStatus.COMPLETED, OrderStatus.PENDING)).toBe(false);
    expect(() => assertTransition(OrderStatus.COMPLETED, OrderStatus.PENDING)).toThrow(BadRequestException);
  });

  it('Không cho phép CANCELLED chuyển sang PAID và ném lỗi BadRequestException', () => {
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(false);
    expect(() => assertTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toThrow(BadRequestException);
  });

  it('cho phép PREPARING chuyển sang READY', () => {
    expect(canTransition(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
    expect(() => assertTransition(OrderStatus.PREPARING, OrderStatus.READY)).not.toThrow();
  });

  it('không cho phép READY chuyển ngược về PREPARING', () => {
    expect(canTransition(OrderStatus.READY, OrderStatus.PREPARING)).toBe(false);
    expect(() => assertTransition(OrderStatus.READY, OrderStatus.PREPARING)).toThrow(BadRequestException);
  });
});
