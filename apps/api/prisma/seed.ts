import { PrismaClient, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding BrewLite initial data...');

  // 1. Seed Products
  const products = [
    {
      name: 'Cà phê sữa đá',
      description: 'Cà phê Robusta đậm đà kết hợp sữa đặc ngọt béo truyền thống.',
      price: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60',
      stock: 50,
      isAvailable: true,
    },
    {
      name: 'Americano',
      description: 'Espresso nguyên chất pha loãng với nước ấm/đá, hương vị thanh tao.',
      price: 40000,
      imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=60',
      stock: 50,
      isAvailable: true,
    },
    {
      name: 'Cappuccino',
      description: 'Sự kết hợp hoàn hảo giữa Espresso, sữa nóng và lớp bọt sữa mịn màng.',
      price: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60',
      stock: 40,
      isAvailable: true,
    },
    {
      name: 'Trà đào cam sả',
      description: 'Trà thảo mộc thơm mát kết hợp vị ngọt thanh của đào và hương cam sả sảng khoái.',
      price: 39000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60',
      stock: 60,
      isAvailable: true,
    },
    {
      name: 'Trà sữa Oolong nướng',
      description: 'Trà Oolong đậm vị trà hòa quyện cùng vị sữa béo ngậy đặc trưng.',
      price: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=500&auto=format&fit=crop&q=60',
      stock: 35,
      isAvailable: true,
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({ data: p });
    }
  }

  // 2. Seed Toppings
  const toppings = [
    { name: 'Trân châu đen', price: 10000, isAvailable: true },
    { name: 'Trân châu trắng', price: 10000, isAvailable: true },
    { name: 'Kem Cheese', price: 12000, isAvailable: true },
    { name: 'Thạch nha đam', price: 8000, isAvailable: true },
  ];

  for (const t of toppings) {
    const existing = await prisma.topping.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.topping.create({ data: t });
    }
  }

  // 3. Seed Promotions
  const promotions = [
    {
      code: 'BREWLITE20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderValue: 50000,
      maxDiscount: 30000,
      usageLimit: 100,
      isActive: true,
      expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
    },
    {
      code: 'GIAM10K',
      discountType: DiscountType.FIXED,
      discountValue: 10000,
      minOrderValue: 40000,
      maxDiscount: 10000,
      usageLimit: 50,
      isActive: true,
      expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const promo of promotions) {
    const existing = await prisma.promotion.findUnique({ where: { code: promo.code } });
    if (!existing) {
      await prisma.promotion.create({ data: promo });
    }
  }

  // 4. Seed Demo User (password is '123456')
  const demoEmail = 'customer@brewlite.vn';
  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: demoEmail,
        fullName: 'Khách hàng Thử Nghiệm',
        passwordHash: '$2b$10$EP0.P2e43mIu8y6Gq8iK1O6e9mG4Vn7pA8u8p6pB8q3oP2r0nK9mC', // hash của 123456
        loyaltyPoints: 100,
      },
    });
  }

  // 5. Seed Demo Order (Pending) for Checkout test
  const existingOrder = await prisma.order.findUnique({ where: { id: 1 } });
  if (!existingOrder) {
    const demoUser = await prisma.user.findUnique({ where: { email: demoEmail } });
    if (demoUser) {
      await prisma.order.create({
        data: {
          id: 1,
          userId: demoUser.id,
          status: 'PENDING',
          subtotal: 123000,
          discountAmount: 0,
          total: 123000,
          pointsEarned: 10,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

