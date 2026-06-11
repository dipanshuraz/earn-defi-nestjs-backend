import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class TransactionResponseDto {
  @ApiProperty({ example: 'f8b3c2a1-4d5e-6f7a-8b9c-0d1e2f3a4b5c' })
  transactionId!: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.DEPOSIT })
  type!: TransactionType;

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.CONFIRMED })
  status!: TransactionStatus;

  @ApiProperty({ example: '1000000' })
  amount!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  walletId?: string;

  @ApiPropertyOptional({ example: 'aave-base-sepolia-usdc' })
  vaultId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  positionId?: string;

  @ApiPropertyOptional({
    example:
      '0xabc123def4567890123456789012345678901234567890123456789012345678',
  })
  txHash?: string;

  @ApiPropertyOptional({ example: '18450321' })
  blockNumber?: string;

  @ApiPropertyOptional({
    example: 'https://sepolia.basescan.org/tx/0xabc123...',
  })
  explorerUrl?: string;

  @ApiPropertyOptional({ example: '2026-06-11T12:05:00.000Z' })
  confirmedAt?: string;

  @ApiProperty({ example: '2026-06-11T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-11T12:05:00.000Z' })
  updatedAt!: string;
}

export class TransactionsListResponseDto {
  @ApiProperty({ type: TransactionResponseDto, isArray: true })
  items!: TransactionResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;
}
