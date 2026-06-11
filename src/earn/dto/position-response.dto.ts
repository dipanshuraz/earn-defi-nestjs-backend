import { ApiProperty } from '@nestjs/swagger';
import { PositionStatus } from '@prisma/client';

export class PositionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  positionId!: string;

  @ApiProperty({ example: 'aave-base-sepolia-usdc' })
  vaultId!: string;

  @ApiProperty({ example: 'Steakhouse High Yield Instant' })
  vaultName!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ example: 'USDC' })
  assetSymbol!: string;

  @ApiProperty({ example: 6 })
  assetDecimals!: number;

  @ApiProperty({ enum: PositionStatus, example: PositionStatus.ACTIVE })
  status!: PositionStatus;

  @ApiProperty({ example: '1000000' })
  depositedAmount!: string;

  @ApiProperty({ example: '1000000' })
  currentAmount!: string;

  @ApiProperty({ example: '980392156862745098' })
  shares!: string;

  @ApiProperty({ example: '1.02735' })
  sharePrice!: string;

  @ApiProperty({
    example: '1007205',
    description: 'Current position value in asset base units (shares × sharePrice)',
  })
  currentValue!: string;

  @ApiProperty({ example: '2026-06-11T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-11T12:00:00.000Z' })
  updatedAt!: string;
}
