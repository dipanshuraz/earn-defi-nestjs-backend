import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PrivyClient,
  verifyAccessToken,
  VerifyAccessTokenResponse,
} from '@privy-io/node';
import { createRemoteJWKSet, JWTVerifyGetKey } from 'jose';
import { AuthorizationContext } from '@privy-io/node';
import { PrivyConfig } from '../config/config.types';
import { withTimeout } from '../common/utils/with-timeout.util';

@Injectable()
export class PrivyService implements OnModuleInit {
  private readonly logger = new Logger(PrivyService.name);
  private jwks!: JWTVerifyGetKey;
  private privyConfig!: PrivyConfig;
  private client!: PrivyClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const privyConfig = this.configService.get<PrivyConfig>('privy');

    if (!privyConfig?.appId || !privyConfig.appSecret || !privyConfig.jwksUrl) {
      throw new Error('Privy configuration failed to load');
    }

    this.privyConfig = privyConfig;
    this.jwks = createRemoteJWKSet(new URL(privyConfig.jwksUrl));
    this.client = new PrivyClient({
      appId: privyConfig.appId,
      appSecret: privyConfig.appSecret,
    });

    this.logger.log(`Privy initialized for app ${privyConfig.appId}`);
  }

  getClient(): PrivyClient {
    return this.client;
  }

  getAuthorizationContext(): AuthorizationContext | undefined {
    const privateKey = this.privyConfig.authorizationPrivateKey?.trim();

    if (!privateKey) {
      return undefined;
    }

    return {
      authorization_private_keys: [privateKey],
    };
  }

  getWalletSignerKeyQuorumId(): string | undefined {
    return this.privyConfig.walletSignerKeyQuorumId?.trim() || undefined;
  }

  async verifyAccessToken(token: string): Promise<VerifyAccessTokenResponse> {
    return verifyAccessToken({
      access_token: token,
      app_id: this.privyConfig.appId,
      verification_key: this.jwks,
    });
  }

  async isHealthy(timeoutMs: number): Promise<boolean> {
    try {
      await withTimeout(async () => {
        const response = await fetch(this.privyConfig.jwksUrl, { method: 'GET' });

        if (!response.ok) {
          throw new Error(`Privy JWKS returned ${response.status}`);
        }
      }, timeoutMs, 'Privy health check');

      return Boolean(this.privyConfig.appId && this.privyConfig.appSecret);
    } catch {
      return false;
    }
  }

}
