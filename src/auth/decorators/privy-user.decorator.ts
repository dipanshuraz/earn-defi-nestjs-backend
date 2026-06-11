import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { VerifyAccessTokenResponse } from '@privy-io/node';
import { Request } from 'express';

export const PrivyUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): VerifyAccessTokenResponse => {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.privyUser) {
      throw new Error('Privy user is not available on the request');
    }

    return request.privyUser;
  },
);
