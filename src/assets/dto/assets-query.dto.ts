import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class AssetsQueryDto {
  @ApiPropertyOptional({
    example: 84532,
    description: 'Filter assets by EVM chain ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  chainId?: number;

  @ApiPropertyOptional({
    example: 'USDC',
    description: 'Filter assets by symbol',
  })
  @IsOptional()
  @IsString()
  symbol?: string;
}
