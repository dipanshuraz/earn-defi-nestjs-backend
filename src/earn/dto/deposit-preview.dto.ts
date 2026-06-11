import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsPositiveBigIntString } from '../validators/is-positive-bigint-string.validator';

export class DepositPreviewDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Wallet owned by the authenticated user',
  })
  @IsUUID()
  walletId!: string;

  @ApiProperty({
    example: '1000000',
    description: 'Deposit amount in asset base units (bigint string, no decimals)',
  })
  @IsPositiveBigIntString()
  amount!: string;
}
