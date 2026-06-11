import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { IsPositiveBigIntString } from '../validators/is-positive-bigint-string.validator';

export class WithdrawPositionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Wallet owned by the authenticated user',
  })
  @IsUUID()
  walletId!: string;

  @ApiPropertyOptional({
    example: '500000',
    description: 'Withdrawal amount in asset base units for partial withdrawals',
  })
  @ValidateIf((dto: WithdrawPositionDto) => !dto.fullWithdraw)
  @IsPositiveBigIntString()
  amount?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'When true, withdraws the full position balance',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fullWithdraw?: boolean;
}
