import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';
import { PromotionsController } from './promotions.controller.js';
import { LoyaltyPointsService } from './loyalty.service.js';
import { PercentageDiscountStrategy } from './strategies/percentage-discount.strategy.js';
import { FixedDiscountStrategy } from './strategies/fixed-discount.strategy.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    LoyaltyPointsService,
    PercentageDiscountStrategy,
    FixedDiscountStrategy,
  ],
  exports: [PromotionsService, LoyaltyPointsService],
})
export class PromotionsModule {}
