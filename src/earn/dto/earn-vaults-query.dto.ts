import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class EarnVaultsQueryDto {
  @ApiPropertyOptional({
    example: 84532,
    description: 'Filter vaults by EVM chain ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  chainId?: number;

  @ApiPropertyOptional({
    example: 'USDC',
    description: 'Filter vaults by underlying asset symbol',
  })
  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @ApiPropertyOptional({
    example: 'aave',
    description: 'Filter vaults by protocol name',
  })
  @IsOptional()
  @IsIn(['aave'])
  protocol?: 'aave';
}
