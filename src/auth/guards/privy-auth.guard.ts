import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { InvalidAuthTokenError } from '@privy-io/node';
import { PrivyService } from '../privy.service';

@Injectable()
export class PrivyAuthGuard implements CanActivate {
  constructor(private readonly privyService: PrivyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.privyUser = await this.privyService.verifyAccessToken(token);
      return true;
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        throw new UnauthorizedException('Invalid or expired access token');
      }

      throw error;
    }
  }
}
