import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus as PrismaOrderStatus, ProductSize } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertTransition } from './order-state-machine.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { LoyaltyPointsService } from '../promotions/loyalty.service.js';
import { calculateSugarAndIceConsumption } from '../products/sugar-ice.calculator.js';
import { ProductsService } from '../products/products.service.js';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAID,
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionsService: PromotionsService,
    private readonly loyaltyService: LoyaltyPointsService,
  ) {}

  async createOrder(
    createOrderDto: CreateOrderDto,
    userId: string | number = '0',
  ): Promise<Order> {
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new BadRequestException('Tài khoản người dùng không hợp lệ');
    }

    const productIds = createOrderDto.items.map((item) => Number(item.productId));
    if (productIds.some((productId) => !Number.isInteger(productId) || productId <= 0)) {
      throw new BadRequestException('Mã sản phẩm không hợp lệ');
    }

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, price: true },
      });
      const prices = new Map(products.map((product) => [product.id, product.price]));
      if (products.length !== new Set(productIds).size) {
        throw new BadRequestException('Một hoặc nhiều sản phẩm không tồn tại');
      }

      const productNames = new Map(products.map((product) => [product.id, product.name]));

      // 1. Kiểm tra tồn kho nguyên liệu: Đường, Đá, Cà phê, Trà
      const consumption = calculateSugarAndIceConsumption(
        createOrderDto.items.map((item) => {
          const pId = Number(item.productId);
          return {
            productId: pId,
            productName: productNames.get(pId) || String(pId),
            size: item.size,
            sweetness: item.sweetness,
            ice: item.ice,
            qty: item.quantity,
          };
        }),
      );

      // Lấy tồn kho từ DB (hoặc fallback in-memory)
      let availableSugar = ProductsService.getInMemoryIngredientStock('SUGAR');
      let availableIce = ProductsService.getInMemoryIngredientStock('ICE');
      let availableCoffee = ProductsService.getInMemoryIngredientStock('COFFEE_BEANS');
      let availableTea = ProductsService.getInMemoryIngredientStock('TEA_LEAVES');
      let availableMilk = ProductsService.getInMemoryIngredientStock('MILK');

      try {
        if ((tx as any)?.ingredient?.findUnique) {
          const sugarRecord = await (tx as any).ingredient.findUnique({ where: { code: 'SUGAR' } });
          const iceRecord = await (tx as any).ingredient.findUnique({ where: { code: 'ICE' } });
          const coffeeRecord = await (tx as any).ingredient.findUnique({ where: { code: 'COFFEE_BEANS' } });
          const teaRecord = await (tx as any).ingredient.findUnique({ where: { code: 'TEA_LEAVES' } });
          const milkRecord = await (tx as any).ingredient.findUnique({ where: { code: 'MILK' } });
          if (sugarRecord) availableSugar = sugarRecord.stock;
          if (iceRecord) availableIce = iceRecord.stock;
          if (coffeeRecord) availableCoffee = coffeeRecord.stock;
          if (teaRecord) availableTea = teaRecord.stock;
          if (milkRecord) availableMilk = milkRecord.stock;
        }
      } catch {
        // Fallback in-memory
      }

      if (consumption.totalCoffeeGrams > 0 && availableCoffee < consumption.totalCoffeeGrams) {
        throw new BadRequestException(
          `Kho không đủ hạt cà phê để pha chế (còn ${Math.max(0, Math.floor(availableCoffee))}g, cần ${consumption.totalCoffeeGrams}g). Rất tiếc món cà phê này hiện đã hết hàng!`,
        );
      }

      if (consumption.totalTeaGrams > 0 && availableTea < consumption.totalTeaGrams) {
        throw new BadRequestException(
          `Kho không đủ lá trà để pha chế (còn ${Math.max(0, Math.floor(availableTea))}g, cần ${consumption.totalTeaGrams}g). Rất tiếc món trà này hiện đã hết hàng!`,
        );
      }

      if (consumption.totalMilkMl > 0 && availableMilk < consumption.totalMilkMl) {
        throw new BadRequestException(
          `Kho không đủ sữa để pha chế (còn ${Math.max(0, Math.floor(availableMilk))}ml, cần ${consumption.totalMilkMl}ml). Vui lòng chọn món khác hoặc liên hệ quán!`,
        );
      }

      if (consumption.totalSugarGrams > 0 && availableSugar < consumption.totalSugarGrams) {
        throw new BadRequestException(
          `Kho nguyên liệu không đủ đường để pha chế (còn ${Math.max(0, Math.floor(availableSugar))}g, cần ${consumption.totalSugarGrams}g). Vui lòng chọn mức đường khác hoặc liên hệ quán!`,
        );
      }

      if (consumption.totalIceGrams > 0 && availableIce < consumption.totalIceGrams) {
        throw new BadRequestException(
          `Kho nguyên liệu không đủ đá để pha chế (còn ${Math.max(0, Math.floor(availableIce))}g, cần ${consumption.totalIceGrams}g). Vui lòng chọn Không đá hoặc liên hệ quán!`,
        );
      }

      let calculatedSubtotal = 0;
      const orderItemsData = createOrderDto.items.map((item) => {
        const productId = Number(item.productId);
        const basePrice = prices.get(productId);
        if (basePrice === undefined) {
          throw new BadRequestException(`Không tìm thấy sản phẩm #${productId}`);
        }
        let unitPrice = basePrice;
        if (typeof item.unitPrice === 'number' && item.unitPrice >= basePrice) {
          unitPrice = item.unitPrice;
        } else {
          if (item.size === DrinkSize.M) unitPrice += 5000;
          if (item.size === DrinkSize.L) unitPrice += 10000;
          if (item.toppings && item.toppings.length > 0) {
            unitPrice += item.toppings.length * 5000;
          }
        }
        const lineTotal = unitPrice * item.quantity;
        calculatedSubtotal += lineTotal;
        return {
          productId,
          size: item.size as ProductSize,
          sweetness: item.sweetness || '100%',
          ice: item.ice || 'Bình thường',
          toppings: item.toppings || [],
          unitPrice,
          qty: item.quantity,
          lineTotal,
        };
      });

      const user = await tx.user.findUnique({
        where: { id: parsedUserId },
        select: { id: true, loyaltyPoints: true },
      });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy tài khoản người dùng #${parsedUserId}`);
      }

      let promoDiscount = 0;
      let appliedPromotionId: number | null = null;
      if (createOrderDto.promoCode) {
        const promoResult = await this.promotionsService.validateAndCalculate(
          createOrderDto.promoCode,
          calculatedSubtotal,
        );
        promoDiscount = promoResult.discountAmount;
        appliedPromotionId = promoResult.promotion.id;
      }

      const remainingAfterPromo = Math.max(0, calculatedSubtotal - promoDiscount);
      let pointsDiscount = 0;
      let pointsActuallyUsed = 0;
      if (createOrderDto.pointsToUse && createOrderDto.pointsToUse > 0) {
        const pointsResult = this.loyaltyService.calculatePointsDiscount(
          createOrderDto.pointsToUse,
          remainingAfterPromo,
          user.loyaltyPoints,
        );
        pointsDiscount = pointsResult.discountAmount;
        pointsActuallyUsed = pointsResult.pointsActuallyUsed;
      }

      const totalDiscount = promoDiscount + pointsDiscount;
      const finalTotal = Math.max(0, calculatedSubtotal - totalDiscount);
      const pointsEarned = this.loyaltyService.calculatePointsEarned(finalTotal);

      if (pointsActuallyUsed > 0) {
        await this.loyaltyService.deductPointsInTransaction(tx, parsedUserId, pointsActuallyUsed);
      }
      if (appliedPromotionId) {
        await this.promotionsService.recordUsageInTransaction(tx, appliedPromotionId);
      }

      return tx.order.create({
        data: {
          userId: parsedUserId,
          promotionId: appliedPromotionId,
          status: PrismaOrderStatus.PENDING,
          subtotal: calculatedSubtotal,
          discountAmount: totalDiscount,
          total: finalTotal,
          pointsEarned,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });
    });

    return {
      id: String(createdOrder.id),
      orderCode: `ORD-${createdOrder.id}`,
      userId: String(createdOrder.userId),
      items: createdOrder.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.qty,
        size: item.size as DrinkSize,
        toppings: Array.isArray(item.toppings) ? (item.toppings as string[]) : [],
      })),
      status: createdOrder.status as OrderStatus,
      subtotal: createdOrder.subtotal,
      discountAmount: createdOrder.discountAmount,
      totalAmount: createdOrder.total,
      pointsEarned: createdOrder.pointsEarned,
      promoCode: createOrderDto.promoCode,
      pointsToUse: createOrderDto.pointsToUse,
      createdAt: createdOrder.createdAt,
      updatedAt: createdOrder.updatedAt,
    };
  }

  async findByUserId(userId: string | number, status?: OrderStatus): Promise<Order[]> {
    const targetUserId = String(userId);
    try {
      const uId = Number(userId);
      if (uId) {
        const dbOrders = await this.prisma.order.findMany({
          where: {
            userId: uId,
            ...(status ? { status } : {}),
          },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        });
        if (dbOrders) {
          return dbOrders.map((o) => ({
            id: String(o.id),
            orderCode: `ORD-${o.id}`,
            userId: String(o.userId),
            status: o.status as any,
            subtotal: o.subtotal,
            discountAmount: o.discountAmount,
            totalAmount: o.total,
            pointsEarned: o.pointsEarned,
            items: o.items.map((item) => ({
              productId: String(item.productId),
              quantity: item.qty,
              size: item.size as any,
              toppings: Array.isArray(item.toppings) ? (item.toppings as string[]) : [],
            })),
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
          }));
        }
      }
    } catch (error) {
      console.error('Không thể đọc đơn hàng từ Database:', error);
      throw error;
    }
    return this.orders
      .filter((order) => {
        const matchUser = String(order.userId) === targetUserId;
        const matchStatus = status ? order.status === status : true;
        return matchUser && matchStatus;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByCode(orderCode: string): Promise<Order> {
    const orderId = orderCode.startsWith('ORD-') ? Number(orderCode.slice(4)) : Number(orderCode);
    if (Number.isInteger(orderId) && orderId > 0) {
      const dbOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });
      if (dbOrder) {
        return {
          id: String(dbOrder.id),
          orderCode: `ORD-${dbOrder.id}`,
          userId: String(dbOrder.userId),
          status: dbOrder.status as OrderStatus,
          subtotal: dbOrder.subtotal,
          discountAmount: dbOrder.discountAmount,
          totalAmount: dbOrder.total,
          pointsEarned: dbOrder.pointsEarned,
          items: dbOrder.items.map((item) => ({
            productId: String(item.productId),
            productName: item.product?.name,
            quantity: item.qty,
            size: item.size as DrinkSize,
            sweetness: item.sweetness || '100%',
            ice: item.ice || 'Bình thường',
            toppings: Array.isArray(item.toppings) ? (item.toppings as string[]) : [],
          })),
          createdAt: dbOrder.createdAt,
          updatedAt: dbOrder.updatedAt,
        };
      }
    }
    const order = this.orders.find(
      (o) => o.orderCode === orderCode || o.id === orderCode,
    );
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã: ${orderCode}`);
    }
    return order;
  }

  findAll(): Order[] {
    return [...this.orders].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Hoàn lại số lượng topping khi đơn hàng đã thanh toán bị hủy
   */
  private async restoreToppingStock(orderId: number, fallbackOrder?: Order): Promise<void> {
    try {
      let items: any[] = [];
      if (this.prisma?.order?.findUnique && Number.isInteger(orderId) && orderId > 0) {
        try {
          const orderWithItems = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
          });
          if (orderWithItems && orderWithItems.items && orderWithItems.items.length > 0) {
            items = orderWithItems.items;
          }
        } catch {
          // ignore db error
        }
      }

      if (items.length === 0 && fallbackOrder?.items) {
        items = fallbackOrder.items.map((i) => ({
          qty: i.quantity,
          toppings: i.toppings,
        }));
      }

      if (items.length === 0) return;

      const toppingCounts = new Map<string, number>();
      for (const item of items) {
        const itemQty = Number(item.qty || item.quantity || 1);
        if (Array.isArray(item.toppings)) {
          for (const t of item.toppings as any[]) {
            const toppingName = typeof t === 'string' ? t : t?.name;
            if (toppingName && typeof toppingName === 'string') {
              toppingCounts.set(toppingName, (toppingCounts.get(toppingName) || 0) + itemQty);
            }
          }
        }
      }

      for (const [toppingName, count] of toppingCounts.entries()) {
        // 1. Hoàn lại trong bộ nhớ (in-memory)
        ProductsService.restoreInMemoryToppingStock(toppingName, count);

        // 2. Hoàn lại trong CSDL nếu có
        try {
          if (this.prisma?.topping?.findFirst) {
            const existingTopping = await this.prisma.topping.findFirst({
              where: { name: { equals: toppingName, mode: 'insensitive' } },
            });
            if (existingTopping) {
              const newStock = existingTopping.stock + count;
              await this.prisma.topping.update({
                where: { id: existingTopping.id },
                data: {
                  stock: newStock,
                  isAvailable: newStock > 0,
                },
              });
            }
          }
        } catch (dbErr) {
          console.warn(`Không thể hoàn tồn kho DB cho topping "${toppingName}":`, dbErr);
        }
      }
    } catch (err) {
      console.warn('Lỗi khi hoàn trả tồn kho topping khi hủy đơn:', err);
    }
  }

  /**
   * Hoàn lại số lượng nguyên liệu (Cà phê, Sữa, Trà, Đường, Đá) khi đơn hàng đã thanh toán bị hủy
   */
  private async restoreIngredientStock(orderId: number, fallbackOrder?: Order): Promise<void> {
    try {
      let itemsForConsumption: any[] = [];
      if (this.prisma?.order?.findUnique && Number.isInteger(orderId) && orderId > 0) {
        try {
          const orderWithItems = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } },
          });
          if (orderWithItems && orderWithItems.items && orderWithItems.items.length > 0) {
            itemsForConsumption = orderWithItems.items.map((item: any) => ({
              productId: item.productId,
              productName: item.product?.name || String(item.productId),
              size: item.size,
              sweetness: item.sweetness,
              ice: item.ice,
              qty: item.qty,
            }));
          }
        } catch {
          // ignore db error
        }
      }

      if (itemsForConsumption.length === 0 && fallbackOrder?.items) {
        itemsForConsumption = fallbackOrder.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName || String(item.productId),
          size: item.size,
          sweetness: item.sweetness || '100%',
          ice: item.ice || 'Bình thường',
          qty: item.quantity || (item as any).qty || 1,
        }));
      }

      if (itemsForConsumption.length === 0) return;

      const consumption = calculateSugarAndIceConsumption(itemsForConsumption);

      // 1. Luôn hoàn lại in-memory trước (fallback)
      if (consumption.totalSugarGrams > 0) {
        ProductsService.restoreInMemoryIngredientStock('SUGAR', consumption.totalSugarGrams);
      }
      if (consumption.totalIceGrams > 0) {
        ProductsService.restoreInMemoryIngredientStock('ICE', consumption.totalIceGrams);
      }
      if (consumption.totalCoffeeGrams > 0) {
        ProductsService.restoreInMemoryIngredientStock('COFFEE_BEANS', consumption.totalCoffeeGrams);
      }
      if (consumption.totalTeaGrams > 0) {
        ProductsService.restoreInMemoryIngredientStock('TEA_LEAVES', consumption.totalTeaGrams);
      }
      if (consumption.totalMilkMl > 0) {
        ProductsService.restoreInMemoryIngredientStock('MILK', consumption.totalMilkMl);
      }

      // 2. Hoàn lại trong cơ sở dữ liệu nếu bảng ingredient tồn tại
      try {
        if ((this.prisma as any)?.ingredient) {
          const restoreDb = async (code: string, amount: number) => {
            if (amount <= 0) return;
            const current = await (this.prisma as any).ingredient.findUnique({
              where: { code },
            });
            if (current) {
              const newStock = Math.round((current.stock + amount) * 10) / 10;
              await (this.prisma as any).ingredient.update({
                where: { code },
                data: { stock: newStock },
              });
            }
          };

          await restoreDb('SUGAR', consumption.totalSugarGrams);
          await restoreDb('ICE', consumption.totalIceGrams);
          await restoreDb('COFFEE_BEANS', consumption.totalCoffeeGrams);
          await restoreDb('TEA_LEAVES', consumption.totalTeaGrams);
          await restoreDb('MILK', consumption.totalMilkMl);
        }
      } catch (dbErr) {
        console.warn('Không thể hoàn tồn kho nguyên liệu trong DB:', dbErr);
      }
    } catch (err) {
      console.warn('Lỗi khi tính toán và hoàn tồn kho nguyên liệu khi hủy đơn:', err);
    }
  }

  /**
   * Hoàn lại toàn bộ tồn kho (nguyên liệu và topping) của một đơn hàng đã thanh toán
   */
  async restoreStock(orderId: number, fallbackOrder?: Order): Promise<void> {
    if (ProductsService.isStockRestored(orderId)) {
      return;
    }
    ProductsService.markStockRestored(orderId);

    await this.restoreToppingStock(orderId, fallbackOrder);
    await this.restoreIngredientStock(orderId, fallbackOrder);
  }

  async transitionOrderStatus(orderCode: string, nextStatus: OrderStatus): Promise<Order> {
    const order = await this.findByCode(orderCode);
    if (order.status === nextStatus) {
      return order;
    }
    assertTransition(order.status, nextStatus);
    const orderId = Number(order.id);

    // Nếu đơn hàng đang ở trạng thái PAID và khách/quán thực hiện hủy đơn (CANCELLED)
    // -> Hoàn trả lại toàn bộ tồn kho nguyên liệu và topping
    if (order.status === OrderStatus.PAID && nextStatus === OrderStatus.CANCELLED) {
      await this.restoreStock(orderId, order);
    }

    if (Number.isInteger(orderId) && orderId > 0) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: nextStatus as PrismaOrderStatus },
        include: { items: true },
      });
      return {
        id: order.id,
        orderCode: order.orderCode,
        userId: order.userId,
        items: order.items,
        totalAmount: updatedOrder.total,
        status: updatedOrder.status as OrderStatus,
        promoCode: order.promoCode,
        pointsToUse: order.pointsToUse,
        createdAt: order.createdAt,
        updatedAt: updatedOrder.updatedAt,
      };
    }
    order.status = nextStatus;
    order.updatedAt = new Date();
    return order;
  }
}
