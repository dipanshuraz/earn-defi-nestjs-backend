import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EarnModule } from '../earn/earn.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, EarnModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
