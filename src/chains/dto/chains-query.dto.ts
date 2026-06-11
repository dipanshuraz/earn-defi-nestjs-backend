import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class ChainsQueryDto {
  @ApiPropertyOptional({
    example: 84532,
    description: 'Filter chains by EVM chain ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  chainId?: number;
}
