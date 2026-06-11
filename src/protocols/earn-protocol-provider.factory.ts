import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProtocolsConfig } from '../config/config.types';
import { AaveProvider } from './aave/aave.provider';
import { EARN_PROTOCOL_PROVIDER, EarnProtocolProvider } from './earn-protocol-provider.interface';

@Injectable()
export class EarnProtocolProviderFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly aaveProvider: AaveProvider,
  ) {}

  create(): EarnProtocolProvider {
    const protocolsConfig = this.configService.get<Pick<ProtocolsConfig, 'provider'>>('protocols');
    const provider = protocolsConfig?.provider ?? 'aave';

    if (provider !== 'aave') {
      throw new Error(
        `Unsupported earn protocol provider "${provider as string}". Only "aave" is supported.`,
      );
    }

    return this.aaveProvider;
  }
}

export const earnProtocolProviderFactory = {
  provide: EARN_PROTOCOL_PROVIDER,
  useFactory: (factory: EarnProtocolProviderFactory) => factory.create(),
  inject: [EarnProtocolProviderFactory],
};
