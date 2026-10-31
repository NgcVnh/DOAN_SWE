import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus as PrismaOrderStatus, ProductSize } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertTransition } from './order-state-machine.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { LoyaltyPointsService } from '../promotions/loyalty.service.js';

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
        select: { id: true, price: true },
      });
      const prices = new Map(products.map((product) => [product.id, product.price]));
      if (products.length !== new Set(productIds).size) {
        throw new BadRequestException('Một hoặc nhiều sản phẩm không tồn tại');
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
        include: { items: true },
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
            quantity: item.qty,
            size: item.size as DrinkSize,
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

  async transitionOrderStatus(orderCode: string, nextStatus: OrderStatus): Promise<Order> {
    const order = await this.findByCode(orderCode);
    if (order.status === nextStatus) {
      return order;
    }
    assertTransition(order.status, nextStatus);
    const orderId = Number(order.id);
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
