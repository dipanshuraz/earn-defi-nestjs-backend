import { registerAs } from '@nestjs/config';
import { JwtConfig } from './config.types';

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  }),
);
