import { OrderStatus } from './enums/order-status.enum.js';
import { canTransition } from './order-state-machine.js';
import { describe, it, expect } from 'vitest';

describe('OderStateMachine',()=>{
    it('cho phép PENDING chuyển sang PAID',()=>{
        expect(
            canTransition(
                OrderStatus.PENDING,
                OrderStatus.PAID),
        ).toBe(true);
    });

    it('cho phép PENDING chuyển sang PAYMENT_FAILED',()=>{
        expect(
            canTransition(
                OrderStatus.PENDING,
                 OrderStatus.PAYMENT_FAILED),
        ).toBe(true);
    });

    it('Không cho phép COMPLETED chuyển sang PEANDING',()=>{
        expect(
            canTransition(
                OrderStatus.COMPLETED,
                OrderStatus.PENDING,),
        ).toBe(false);
    });

    it('Không cho phép CANELLED chuyển sang PAID',()=>{
        expect(
            canTransition(
                OrderStatus.CANCELED,
                OrderStatus.PAID,),
        ).toBe(false);
    });

    it('cho phép PREPARING chuyển sang READY', () => {
    expect(
      canTransition(
        OrderStatus.PREPARING,
        OrderStatus.READY,
      ),
    ).toBe(true);
  });

  it('không cho phép READY chuyển ngược về PREPARING', () => {
    expect(
      canTransition(
        OrderStatus.READY,
        OrderStatus.PREPARING,
      ),
    ).toBe(false);
  });
})