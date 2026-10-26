import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard.js';

describe('OrdersController (e2e) - Task 10.2 Integration & Inventory', () => {
  let app: INestApplication<App>;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'test-user-1' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Authenticate with seeded user
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'customer@brewlite.vn', password: '123456' });

    if (loginRes.body?.accessToken) {
      authToken = loginRes.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  let createdOrderCode: string;

  it('POST /orders - should create an order with status PENDING', async () => {
    const payload = {
      items: [
        {
          productId: '1',
          quantity: 2,
          size: 'M',
          toppings: ['Trân châu đen', 'Thạch phô mai'],
        },
      ],
      promoCode: 'GIAM10K',
    };

    const req = request(app.getHttpServer()).post('/orders');
    if (authToken) {
      req.set('Authorization', `Bearer ${authToken}`);
    }

    const res = await req
      .send(payload)
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.orderCode).toBeDefined();
    expect(res.body.status).toBe('PENDING');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.totalAmount).toBeGreaterThan(0);

    createdOrderCode = res.body.orderCode;
  });

  it('POST /orders - should fail with 400 when product is out of stock (Chống bán vượt tồn kho)', async () => {
    const payload = {
      items: [
        {
          productId: 'prod-limited',
          quantity: 999, // Vượt quá tồn kho
          size: 'M',
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(400);

    expect(res.body.message).toContain('không đủ tồn kho');
  });

  it('POST /orders - should fail validation with 400 when items are empty', async () => {
    const payload = {
      items: [],
    };

    const req = request(app.getHttpServer()).post('/orders');
    if (authToken) {
      req.set('Authorization', `Bearer ${authToken}`);
    }

    const res = await req
      .send(payload)
      .expect(400);

    expect(res.body.message).toContain('Giỏ hàng không được để trống');
  });

  it('POST /orders - should fail validation with 400 when size is invalid', async () => {
    const payload = {
      items: [
        {
          productId: 'prod-cafe',
          quantity: 1,
          size: 'XL', // Không hợp lệ
        },
      ],
    };

    const req = request(app.getHttpServer()).post('/orders');
    if (authToken) {
      req.set('Authorization', `Bearer ${authToken}`);
    }

    const res = await req
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('GET /orders/:orderCode - should return the created order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${createdOrderCode}`)
      .expect(200);

    expect(res.body.orderCode).toBe(createdOrderCode);
    expect(res.body.status).toBe('PENDING');
  });

  it('PATCH /orders/:orderCode/status - should update status to PAID', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/orders/${createdOrderCode}/status`)
      .send({ status: 'PAID' })
      .expect(200);

    expect(res.body.orderCode).toBe(createdOrderCode);
    expect(res.body.status).toBe('PAID');
  });
});
