import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateWalletDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Mark this wallet as the user primary wallet',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    example: 84532,
    description: 'EVM chain ID. Defaults to the configured application chain ID.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  chainId?: number;
}

export class WalletBalanceDto {
  @ApiProperty({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    description: 'On-chain wallet address',
  })
  address!: string;

  @ApiProperty({ example: 84532, description: 'EVM chain ID' })
  chainId!: number;

  @ApiProperty({
    example: '1000000000000000',
    description: 'Balance in the smallest on-chain unit (wei)',
  })
  balance!: string;

  @ApiProperty({ example: 'ETH' })
  symbol!: string;

  @ApiProperty({ example: 18 })
  decimals!: number;
}

export class WalletResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Internal application wallet ID',
  })
  walletId!: string;

  @ApiProperty({
    example: 'cmqwallet123abc456',
    description: 'Privy-managed wallet ID',
  })
  privyWalletId!: string;

  @ApiProperty({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    description: 'On-chain wallet address',
  })
  walletAddress!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ enum: WalletType, example: WalletType.EMBEDDED })
  walletType!: WalletType;

  @ApiProperty({ example: true })
  isPrimary!: boolean;

  @ApiProperty({ example: '2026-06-11T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-11T12:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({
    type: WalletBalanceDto,
    description: 'Native ETH balance (convenience alias for balances entry)',
  })
  balance?: WalletBalanceDto;

  @ApiPropertyOptional({
    type: WalletBalanceDto,
    isArray: true,
    description: 'Live on-chain balances fetched from Privy (ETH + USDC)',
  })
  balances?: WalletBalanceDto[];
}
