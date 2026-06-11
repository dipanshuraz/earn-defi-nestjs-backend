import { ApiProperty } from '@nestjs/swagger';

export class DepositPreviewResponseDto {
  @ApiProperty({ example: 'aave-base-sepolia-usdc' })
  vaultId!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  walletId!: string;

  @ApiProperty({
    example: '1000000',
    description: 'Requested deposit amount in asset base units',
  })
  amount!: string;

  @ApiProperty({
    example: '5000000',
    description: 'Wallet asset balance in base units',
  })
  walletBalance!: string;

  @ApiProperty({
    example: '0',
    description: 'Current ERC-20 allowance for the vault in base units',
  })
  allowance!: string;

  @ApiProperty({
    example: true,
    description: 'Whether an approve transaction is required before deposit',
  })
  requiresApproval!: boolean;

  @ApiProperty({
    example: '185432',
    description: 'Estimated gas for required transactions in base units',
  })
  estimatedGas!: string;

  @ApiProperty({
    example: '980392156862745098',
    description: 'Estimated vault shares from previewDeposit',
  })
  estimatedShares!: string;
}
