import { ApiProperty } from '@nestjs/swagger';

export class HealthDetailsResponseDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  database!: 'up' | 'down';

  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  redis!: 'up' | 'down';

  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  rpc!: 'up' | 'down';

  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  privy!: 'up' | 'down';
}
