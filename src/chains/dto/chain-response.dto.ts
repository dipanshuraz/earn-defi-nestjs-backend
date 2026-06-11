import { ApiProperty } from '@nestjs/swagger';

export class ChainNativeCurrencyDto {
  @ApiProperty({ example: 'Ether' })
  name!: string;

  @ApiProperty({ example: 'ETH' })
  symbol!: string;

  @ApiProperty({ example: 18 })
  decimals!: number;
}

export class ChainResponseDto {
  @ApiProperty({ example: 'base-sepolia' })
  slug!: string;

  @ApiProperty({ example: 'Base Sepolia' })
  name!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ example: true })
  isTestnet!: boolean;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({ example: 'https://base-sepolia.g.alchemy.com/v2/...' })
  rpcUrl!: string;

  @ApiProperty({ example: 'https://sepolia.basescan.org' })
  explorerUrl!: string;

  @ApiProperty({ type: ChainNativeCurrencyDto })
  nativeCurrency!: ChainNativeCurrencyDto;
}
