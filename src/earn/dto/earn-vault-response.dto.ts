import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EarnVaultMetadataDto {
  @ApiPropertyOptional({ example: 'Supply USDC to Aave V3' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://aave.com/favicon.ico' })
  image?: string;

  @ApiPropertyOptional({ example: 'Steakhouse Financial' })
  curator?: string;
}

export class EarnVaultResponseDto {
  @ApiProperty({ example: 'aave-base-sepolia-usdc' })
  vaultId!: string;

  @ApiProperty({ example: 'aave' })
  protocol!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ example: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27' })
  contractAddress!: string;

  @ApiProperty({ example: 'Aave V3 USDC' })
  name!: string;

  @ApiProperty({ example: 'aBasUSDC' })
  symbol!: string;

  @ApiProperty({ example: 'USDC' })
  assetSymbol!: string;

  @ApiProperty({ example: 6 })
  assetDecimals!: number;

  @ApiProperty({ example: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f' })
  assetAddress!: string;

  @ApiProperty({
    example: '4.6700',
    description: 'Annual percentage yield as a decimal string',
  })
  apy!: string;

  @ApiProperty({
    example: '1438290000000',
    description: 'Total value locked in asset base units',
  })
  tvl!: string;

  @ApiProperty({
    example: '1022181171366198',
    description: 'Share price scaled to asset decimals',
  })
  sharePrice!: string;

  @ApiProperty({
    example: '1400000000000000000',
    description: 'Total vault shares in base units',
  })
  totalSupply!: string;

  @ApiProperty({ type: EarnVaultMetadataDto })
  metadata!: EarnVaultMetadataDto;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({ example: true })
  depositEnabled!: boolean;

  @ApiProperty({ example: true })
  withdrawEnabled!: boolean;

  @ApiProperty({ example: 'medium', enum: ['low', 'medium', 'high'] })
  riskLevel!: 'low' | 'medium' | 'high';
}
