import { registerAs } from '@nestjs/config';
import { ProtocolsConfig } from './config.types';

export default registerAs('protocols', (): Pick<ProtocolsConfig, 'provider'> => {
  const provider = process.env.EARN_PROTOCOL_PROVIDER ?? 'aave';

  if (provider !== 'aave') {
    throw new Error(`Unsupported earn protocol provider: ${provider}`);
  }

  return { provider: 'aave' };
});
