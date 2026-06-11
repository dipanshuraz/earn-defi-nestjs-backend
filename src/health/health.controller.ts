import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import { HealthDetailsResponseDto } from './dto/health-details-response.dto';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthReadyResponseDto } from './dto/health-ready-response.dto';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.healthService.getHealth();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness check including database connectivity' })
  @ApiOkResponse({ type: HealthReadyResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthReadyResponseDto })
  getReadiness(): Promise<HealthReadyResponseDto> {
    return this.healthService.getReadiness();
  }

  @Get('details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detailed dependency health checks' })
  @ApiOkResponse({ type: HealthDetailsResponseDto })
  getDetails(): Promise<HealthDetailsResponseDto> {
    return this.healthService.getDetails();
  }
}
