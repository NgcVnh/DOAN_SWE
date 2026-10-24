import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Orders & Payments Controller (e2e) - Task 10 Verification', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  let createdOrderCode: string;

  // =========================================================================
  // 1. TẠO ĐƠN HÀNG VỚI KHUYẾN MÃI (PROMOTION)
  // =========================================================================
  it('POST /orders - tạo đơn hàng thành công với trạng thái PENDING và mã giảm giá', async () => {
    const payload = {
      items: [
        {
          productId: 'prod-tra-sua-olong',
          quantity: 2,
          size: 'M',
          toppings: ['Trân châu đen', 'Thạch phô mai'],
        },
      ],
      promoCode: 'GIAM10K',
    };

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.orderCode).toBeDefined();
    expect(res.body.status).toBe('PENDING');
    expect(res.body.discountAmount).toBe(10000);
    expect(res.body.totalAmount).toBeGreaterThan(0);

    createdOrderCode = res.body.orderCode;
  });

  // =========================================================================
  // 2. KIỂM THỬ ORDER STATE MACHINE
  // =========================================================================
  it('PATCH /orders/:orderCode/status - hợp lệ: PENDING -> PAID', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/orders/${createdOrderCode}/status`)
      .send({ status: 'PAID' })
      .expect(200);

    expect(res.body.orderCode).toBe(createdOrderCode);
    expect(res.body.status).toBe('PAID');
  });

  it('PATCH /orders/:orderCode/status - vi phạm State Machine: PAID -> PENDING bị từ chối 400', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/orders/${createdOrderCode}/status`)
      .send({ status: 'PENDING' })
      .expect(400);

    expect(res.body.message).toContain('Vi phạm Order State Machine');
  });

  it('PATCH /orders/:orderCode/status - tiếp tục luồng: PAID -> PREPARING -> READY -> COMPLETED', async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${createdOrderCode}/status`)
      .send({ status: 'PREPARING' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/orders/${createdOrderCode}/status`)
      .send({ status: 'READY' })
      .expect(200);

    const completed = await request(app.getHttpServer())
      .patch(`/orders/${createdOrderCode}/status`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    expect(completed.body.status).toBe('COMPLETED');
  });

  it('PATCH /orders/:orderCode/status - chặn thay đổi trạng thái khi đơn đã COMPLETED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/orders/${createdOrderCode}/status`)
      .send({ status: 'CANCELLED' })
      .expect(400);

    expect(res.body.message).toContain('đã hoàn tất (COMPLETED)');
  });

  // =========================================================================
  // 3. KIỂM THỬ THANH TOÁN IDEMPOTENT (POST /payments)
  // =========================================================================
  it('POST /payments - thanh toán idempotent: gọi lần đầu thành công, lần 2 trả về kết quả cũ kèm cờ isIdempotent', async () => {
    // 1. Tạo đơn mới
    await request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [{ productId: '1', quantity: 1, size: 'M' }],
      })
      .expect(201);

    const key = `idem-key-${Date.now()}`;
    const paymentPayload = {
      orderId: 1,
      method: 'WALLET',
      idempotencyKey: key,
      mockSuccess: true,
    };

    // Gọi lần 1
    const res1 = await request(app.getHttpServer())
      .post('/payments')
      .send(paymentPayload)
      .expect(201);

    expect(res1.body.success).toBe(true);
    expect(res1.body.orderStatus).toBe('PAID');

    // Gọi lần 2 với cùng key (mô phỏng retry mạng / người dùng bấm đúp)
    const res2 = await request(app.getHttpServer())
      .post('/payments')
      .send(paymentPayload)
      .expect(201);

    expect(res2.body.success).toBe(true);
    expect(res2.body.isIdempotent).toBe(true);
  });
});
