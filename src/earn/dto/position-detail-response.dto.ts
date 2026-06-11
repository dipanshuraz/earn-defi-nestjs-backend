import { ApiProperty } from '@nestjs/swagger';
import { PositionResponseDto } from './position-response.dto';
import { TransactionResponseDto } from './transaction-response.dto';

export class PositionDetailResponseDto extends PositionResponseDto {
  @ApiProperty({ type: TransactionResponseDto, isArray: true })
  transactions!: TransactionResponseDto[];
}
