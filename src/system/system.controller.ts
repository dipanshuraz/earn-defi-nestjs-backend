import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SystemService } from './system.service';
import { EnvironmentResponseDto } from './dto/environment-response.dto';

@ApiTags('system')
@SkipThrottle()
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('environment')
  @ApiOperation({ summary: 'Get runtime environment and chain configuration' })
  @ApiOkResponse({ type: EnvironmentResponseDto })
  getEnvironment(): EnvironmentResponseDto {
    return this.systemService.getEnvironment();
  }
}
