import { ApiProperty } from '@nestjs/swagger';

export class AssetResponseDto {
  @ApiProperty({ example: 'USDC' })
  symbol!: string;

  @ApiProperty({ example: 'USD Coin' })
  name!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({
    example: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    description: 'Use "native" for the chain native asset',
  })
  contractAddress!: string;

  @ApiProperty({ example: 6 })
  decimals!: number;

  @ApiProperty({ example: true })
  isEnabled!: boolean;
}
