import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckComponentDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  status!: 'up' | 'down';
}

export class HealthReadyResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status!: 'ok' | 'error';

  @ApiProperty({
    example: { database: { status: 'up' } },
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  checks!: Record<string, HealthCheckComponentDto>;
}
