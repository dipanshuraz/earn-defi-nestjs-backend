import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '@prisma/client';

export class ApproveVaultResponseDto {
  @ApiProperty({ example: 'aave-base-sepolia-usdc' })
  vaultId!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  walletId!: string;

  @ApiProperty({ example: '1000000' })
  amount!: string;

  @ApiProperty({ example: '1000000' })
  allowance!: string;

  @ApiProperty({ example: true })
  requiresApproval!: boolean;

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.CONFIRMED,
  })
  status!: TransactionStatus;

  @ApiProperty({ example: 'f8b3c2a1-4d5e-6f7a-8b9c-0d1e2f3a4b5c' })
  transactionId!: string;

  @ApiPropertyOptional({
    example: '0xabc123def4567890123456789012345678901234567890123456789012345678',
  })
  txHash?: string;

  @ApiPropertyOptional({ example: '18450321' })
  blockNumber?: string;

  @ApiPropertyOptional({
    example: 'https://sepolia.basescan.org/tx/0xabc123...',
  })
  explorerUrl?: string;
}
