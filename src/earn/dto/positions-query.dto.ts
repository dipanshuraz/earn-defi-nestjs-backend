import { ApiPropertyOptional } from '@nestjs/swagger';
import { PositionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class PositionsQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter positions that have transactions from this wallet',
  })
  @IsOptional()
  @IsUUID()
  walletId?: string;

  @ApiPropertyOptional({
    example: 'aave-base-sepolia-usdc',
    description: 'Filter by protocol vault slug',
  })
  @IsOptional()
  vaultId?: string;

  @ApiPropertyOptional({ enum: PositionStatus, example: PositionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PositionStatus)
  status?: PositionStatus;
}
