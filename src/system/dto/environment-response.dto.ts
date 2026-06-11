import { ApiProperty } from '@nestjs/swagger';
import { AppEnvironment } from '../../config/config.types';

export class EnvironmentResponseDto {
  @ApiProperty({ enum: AppEnvironment, example: AppEnvironment.Local })
  environment!: AppEnvironment;

  @ApiProperty({ example: 'base-sepolia' })
  chain!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;

  @ApiProperty({ example: false })
  mainnetEnabled!: boolean;

  @ApiProperty({ example: false })
  allowMainnetTransactions!: boolean;
}
