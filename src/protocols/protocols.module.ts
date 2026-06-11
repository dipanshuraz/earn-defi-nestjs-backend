import { Module } from '@nestjs/common';
import { AaveProvider } from './aave/aave.provider';
import { AaveViemService } from './aave/aave-viem.service';
import {
  EarnProtocolProviderFactory,
  earnProtocolProviderFactory,
} from './earn-protocol-provider.factory';

@Module({
  providers: [
    AaveViemService,
    AaveProvider,
    EarnProtocolProviderFactory,
    earnProtocolProviderFactory,
  ],
  exports: [earnProtocolProviderFactory, AaveProvider],
})
export class ProtocolsModule {}
