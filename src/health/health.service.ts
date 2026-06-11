import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyService } from '../auth/privy.service';
import { SecurityConfig } from '../config/config.types';
import { EarnBlockchainService } from '../earn/services/earn-blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthDetailsResponseDto } from './dto/health-details-response.dto';
import { HealthResponseDto } from './dto/health-response.dto';
import {
  HealthCheckComponentDto,
  HealthReadyResponseDto,
} from './dto/health-ready-response.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly earnBlockchainService: EarnBlockchainService,
    private readonly privyService: PrivyService,
    private readonly configService: ConfigService,
  ) {}

  getHealth(): HealthResponseDto {
    return { status: 'ok' };
  }

  async getReadiness(): Promise<HealthReadyResponseDto> {
    const [databaseUp, redisUp] = await Promise.all([
      this.prisma.isHealthy(),
      this.checkRedis(),
    ]);

    const checks: Record<string, HealthCheckComponentDto> = {
      database: { status: databaseUp ? 'up' : 'down' },
      redis: { status: redisUp ? 'up' : 'down' },
    };

    const allUp = Object.values(checks).every((check) => check.status === 'up');

    const response: HealthReadyResponseDto = {
      status: allUp ? 'ok' : 'error',
      checks,
    };

    if (!allUp) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  async getDetails(): Promise<HealthDetailsResponseDto> {
    const timeoutMs = this.getDependencyTimeoutMs();

    const [database, redis, rpc, privy] = await Promise.all([
      this.prisma.isHealthy().then((up) => (up ? 'up' : 'down')),
      this.checkRedis().then((up) => (up ? 'up' : 'down')),
      this.earnBlockchainService.isRpcHealthy(timeoutMs).then((up) => (up ? 'up' : 'down')),
      this.privyService.isHealthy(timeoutMs).then((up) => (up ? 'up' : 'down')),
    ]);

    return { database, redis, rpc, privy };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redisService.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  private getDependencyTimeoutMs(): number {
    const security = this.configService.get<SecurityConfig>('security');
    return security?.dependencyCheckTimeoutMs ?? 5000;
  }
}
