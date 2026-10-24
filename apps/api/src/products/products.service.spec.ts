import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrismaService = {
    product: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Cà phê sữa đá',
          price: 35000,
          imageUrl: 'https://example.com/cf.jpg',
          description: 'Cà phê Robusta thơm ngon',
        },
      ]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch all products from Prisma', async () => {
    const products = await service.findAll();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Cà phê sữa đá');
  });
});
