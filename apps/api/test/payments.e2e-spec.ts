import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('PaymentsController (e2e - HTTP Integration Tests)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const user = await prisma.user.upsert({
      where: { email: 'e2e_payments_user@brewlite.vn' },
      update: {},
      create: {
        email: 'e2e_payments_user@brewlite.vn',
        fullName: 'E2E Payments Test User',
        passwordHash: 'dummy_hash',
        loyaltyPoints: 0,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({
      where: { order: { userId: testUserId } },
    });
    await prisma.order.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await app.close();
  });

  async function createOrder(status: OrderStatus = OrderStatus.PENDING, total = 75000) {
    return prisma.order.create({
      data: {
        userId: testUserId,
        status,
        subtotal: total,
        total,
        pointsEarned: 7,
      },
    });
  }

  it('POST /payments - should successfully process payment via WALLET strategy', async () => {
    const order = await createOrder(OrderStatus.PENDING, 55000);
    const key = `e2e-wallet-${Date.now()}`;

    const res = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
        mockSuccess: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.orderStatus).toBe('PAID');
    expect(res.body.isIdempotent).toBe(false);
    expect(res.body.payment.method).toBe('WALLET');
    expect(res.body.payment.transactionRef).toMatch(/^WALLET_/);
  });

  it('POST /payments - should successfully process payment via CARD strategy', async () => {
    const order = await createOrder(OrderStatus.PENDING, 85000);
    const key = `e2e-card-${Date.now()}`;

    const res = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.CARD,
        idempotencyKey: key,
        mockSuccess: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.orderStatus).toBe('PAID');
    expect(res.body.isIdempotent).toBe(false);
    expect(res.body.payment.method).toBe('CARD');
    expect(res.body.payment.transactionRef).toMatch(/^CARD_/);
  });

  it('POST /payments - should return cached result on duplicate idempotencyKey (Idempotency)', async () => {
    const order = await createOrder(OrderStatus.PENDING, 60000);
    const key = `e2e-idemp-${Date.now()}`;

    const firstRes = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
        mockSuccess: true,
      })
      .expect(201);

    expect(firstRes.body.isIdempotent).toBe(false);

    const secondRes = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
        mockSuccess: true,
      })
      .expect(201);

    expect(secondRes.body.isIdempotent).toBe(true);
    expect(secondRes.body.payment.id).toBe(firstRes.body.payment.id);
  });

  it('POST /payments - should return 409 Conflict if idempotencyKey reused with different body', async () => {
    const order1 = await createOrder(OrderStatus.PENDING, 50000);
    const order2 = await createOrder(OrderStatus.PENDING, 60000);
    const key = `e2e-conflict-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order1.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
      })
      .expect(201);

    const conflictRes = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order2.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
      })
      .expect(409);

    expect(conflictRes.body.message).toContain('đã được sử dụng');
  });

  it('POST /payments - should fail with 400 Bad Request when payload is invalid', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: 1,
        method: 'WALLET',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: 1,
        method: 'BITCOIN',
        idempotencyKey: 'valid-key',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: -5,
        method: 'WALLET',
        idempotencyKey: 'valid-key',
      })
      .expect(400);
  });

  it('POST /payments - should handle failure and allow retry with new idempotency key', async () => {
    const order = await createOrder(OrderStatus.PENDING, 99000);
    const failKey = `e2e-fail-${Date.now()}`;

    const failRes = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.CARD,
        idempotencyKey: failKey,
        mockSuccess: false,
      })
      .expect(201);

    expect(failRes.body.success).toBe(false);
    expect(failRes.body.orderStatus).toBe('PAYMENT_FAILED');

    const retryKey = `e2e-retry-${Date.now()}`;
    const retryRes = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: retryKey,
        mockSuccess: true,
      })
      .expect(201);

    expect(retryRes.body.success).toBe(true);
    expect(retryRes.body.orderStatus).toBe('PAID');
  });

  it('POST /payments - should reject payment for already PAID order with 400 Bad Request', async () => {
    const order = await createOrder(OrderStatus.PAID, 40000);
    const key = `e2e-paid-reject-${Date.now()}`;

    const res = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
      })
      .expect(400);

    expect(res.body.message).toContain('Không thể thanh toán cho đơn hàng đang ở trạng thái "PAID"');
  });

  it('GET /payments/order/:orderId - should retrieve payment history for an order', async () => {
    const order = await createOrder(OrderStatus.PENDING, 65000);
    const key = `e2e-history-${Date.now()}`;

    const payRes = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: key,
      })
      .expect(201);

    const historyRes = await request(app.getHttpServer())
      .get(`/payments/order/${order.id}`)
      .expect(200);

    expect(Array.isArray(historyRes.body)).toBe(true);
    expect(historyRes.body.length).toBeGreaterThanOrEqual(1);
    expect(historyRes.body[0].id).toBe(payRes.body.payment.id);

    const singleRes = await request(app.getHttpServer())
      .get(`/payments/${payRes.body.payment.id}`)
      .expect(200);

    expect(singleRes.body.id).toBe(payRes.body.payment.id);
    expect(singleRes.body.idempotencyKey).toBe(key);
  });
});

