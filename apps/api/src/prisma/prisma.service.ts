import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Đã kết nối thành công tới cơ sở dữ liệu PostgreSQL.');
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `Chưa thể kết nối CSDL PostgreSQL (${error.message}). Chuyển sang chế độ chạy an toàn với In-Memory Mock.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}

