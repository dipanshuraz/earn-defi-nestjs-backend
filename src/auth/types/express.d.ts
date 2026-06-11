import { VerifyAccessTokenResponse } from '@privy-io/node';
import { AuthenticatedUser } from '../auth.types';

declare module 'express-serve-static-core' {
  interface Request {
    privyUser?: VerifyAccessTokenResponse;
    user?: AuthenticatedUser;
  }
}
