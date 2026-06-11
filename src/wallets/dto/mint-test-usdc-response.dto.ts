import { ApiProperty } from '@nestjs/swagger';

export class MintTestUsdcResponseDto {
  @ApiProperty({ example: 'a001621e-a447-42f1-a18c-6f207407fe93' })
  walletId!: string;

  @ApiProperty({ example: '0xc92aA94f2fd0Dcd1F90eedb277c6889e4f66458F' })
  walletAddress!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ example: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f' })
  assetAddress!: string;

  @ApiProperty({
    example: '1000000',
    description: 'Minted amount in USDC base units (max 1 USDC per hour)',
  })
  amount!: string;

  @ApiProperty({
    example: '0xabc123def4567890123456789012345678901234567890123456789012345678',
  })
  txHash!: string;
}
