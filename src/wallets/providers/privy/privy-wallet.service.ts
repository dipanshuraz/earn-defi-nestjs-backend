import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrivyService } from '../../../auth/privy.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BroadcastTransaction,
  CreateWalletInput,
  ProviderWallet,
  SendTransactionInput,
  SignTransactionInput,
  SignedTransaction,
  WalletBalance,
} from '../wallet-provider.interface';
import { mapPrivyError } from './privy-wallet.errors';
import { resolveCaip2Chain, resolvePrivyChain, toHexQuantity } from './privy-chain.util';
import { withRetry } from './privy-retry.util';

@Injectable()
export class PrivyWalletService {
  private readonly logger = new Logger(PrivyWalletService.name);

  constructor(
    private readonly privyService: PrivyService,
    private readonly prisma: PrismaService,
  ) {}

  async ensurePrivyUserId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { privyUserId: true, email: true },
    });

    if (user.privyUserId) {
      return user.privyUserId;
    }

    const usersApi = this.privyService.getClient().users();
    const existing = await this.findExistingPrivyUser(usersApi, userId, user.email);

    if (existing) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { privyUserId: existing },
      });

      return existing;
    }

    const linkedAccounts: Array<
      { type: 'custom_auth'; custom_user_id: string } | { type: 'email'; address: string }
    > = [{ type: 'custom_auth', custom_user_id: userId }];

    if (user.email) {
      linkedAccounts.push({ type: 'email', address: user.email });
    }

    const privyUser = await usersApi.create({
      linked_accounts: linkedAccounts,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { privyUserId: privyUser.id },
    });

    this.logger.log(`Linked Privy user ${privyUser.id} to app user ${userId}`);

    return privyUser.id;
  }

  async createWallet(input: CreateWalletInput): Promise<ProviderWallet> {
    return this.execute('create wallet', async () => {
      const signerKeyQuorumId = this.privyService.getWalletSignerKeyQuorumId();
      const authorizationContext = this.privyService.getAuthorizationContext();
      const useServerOwnedWallet = Boolean(signerKeyQuorumId && authorizationContext);

      const wallet = await this.privyService.getClient().wallets().create({
        chain_type: 'ethereum',
        external_id: this.toExternalId(input.userId),
        display_name: `DeFi Earn wallet (${input.chainId})`,
        ...(useServerOwnedWallet
          ? { owner_id: signerKeyQuorumId }
          : input.privyUserId
            ? { owner: { user_id: input.privyUserId } }
            : {}),
        idempotency_key: randomUUID(),
      });

      return {
        providerWalletId: wallet.id,
        address: wallet.address,
        chainId: input.chainId,
      };
    });
  }

  async getWallet(providerWalletId: string, chainId: number): Promise<ProviderWallet> {
    return this.execute('get wallet', async () => {
      const wallet = await this.privyService
        .getClient()
        .wallets()
        .get(providerWalletId);

      return {
        providerWalletId: wallet.id,
        address: wallet.address,
        chainId,
      };
    });
  }

  async getBalances(
    providerWalletId: string,
    chainId: number,
  ): Promise<WalletBalance[]> {
    return this.execute('get wallet balances', async () => {
      const chain = resolvePrivyChain(chainId);
      const assets = ['eth', 'usdc'] as const;
      const wallet = await this.getWallet(providerWalletId, chainId);

      const responses = await Promise.all(
        assets.map((asset) =>
          this.privyService.getClient().wallets().balance.get(providerWalletId, {
            asset,
            chain: chain as 'base_sepolia',
          }),
        ),
      );

      return assets.map((asset, index) => {
        const entry = responses[index]?.balances.find((balance) => balance.asset === asset);

        return {
          address: wallet.address,
          chainId,
          balance: entry?.raw_value ?? '0',
          symbol: asset.toUpperCase(),
          decimals: entry?.raw_value_decimals ?? (asset === 'eth' ? 18 : 6),
        };
      });
    });
  }

  async getBalance(
    providerWalletId: string,
    chainId: number,
  ): Promise<WalletBalance> {
    const balances = await this.getBalances(providerWalletId, chainId);
    return balances.find((entry) => entry.symbol === 'ETH') ?? balances[0]!;
  }

  async ensureWalletServerSigner(providerWalletId: string): Promise<void> {
    await this.assertWalletServerSignable(providerWalletId);
  }

  private async assertWalletServerSignable(providerWalletId: string): Promise<void> {
    const signerKeyQuorumId = this.privyService.getWalletSignerKeyQuorumId();
    const authorizationContext = this.privyService.getAuthorizationContext();

    if (!signerKeyQuorumId || !authorizationContext) {
      throw new BadRequestException(
        'Privy server signing is not configured. Set PRIVY_AUTHORIZATION_PRIVATE_KEY and PRIVY_WALLET_SIGNER_KEY_QUORUM_ID, then restart the server.',
      );
    }

    const wallet = await this.privyService.getClient().wallets().get(providerWalletId);
    const isOwnedByQuorum = wallet.owner_id === signerKeyQuorumId;
    const hasSigner = wallet.additional_signers?.some(
      (signer) => signer.signer_id === signerKeyQuorumId,
    );

    if (!isOwnedByQuorum && !hasSigner) {
      throw new BadRequestException(
        `Wallet ${providerWalletId} cannot be signed by the server. Create a new wallet via POST /api/v1/wallets after configuring Privy authorization keys. Older user-owned wallets are not compatible with server-side signing.`,
      );
    }
  }

  async sendTransaction(input: SendTransactionInput): Promise<BroadcastTransaction> {
    return this.execute('send transaction', async () => {
      await this.assertWalletServerSignable(input.providerWalletId);

      const authorizationContext = this.privyService.getAuthorizationContext();
      const response = await this.privyService
        .getClient()
        .wallets()
        .ethereum()
        .sendTransaction(input.providerWalletId, {
          caip2: resolveCaip2Chain(input.chainId),
          idempotency_key: randomUUID(),
          ...(authorizationContext ? { authorization_context: authorizationContext } : {}),
          params: {
            transaction: {
              chain_id: input.chainId,
              to: input.to,
              value: toHexQuantity(input.value ?? '0'),
              data: input.data ?? '0x',
            },
          },
        });

      return {
        hash: response.hash,
        transactionId: response.transaction_id,
      };
    });
  }

  async prepareTransactionSigning(
    input: SignTransactionInput,
  ): Promise<SignedTransaction> {
    return this.execute('prepare transaction signing', async () => {
      const signed = await this.privyService
        .getClient()
        .wallets()
        .ethereum()
        .signTransaction(input.providerWalletId, {
          idempotency_key: randomUUID(),
          params: {
            transaction: {
              chain_id: input.chainId,
              to: input.to,
              value: toHexQuantity(input.value),
              data: input.data ?? '0x',
            },
          },
        });

      const signedTransaction = signed.signed_transaction;

      return {
        hash: this.deriveTransactionHash(signedTransaction),
        signature: signedTransaction,
        encoding: signed.encoding,
      };
    });
  }

  private async execute<T>(
    context: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await withRetry(operation);
    } catch (error) {
      this.logger.error(`${context} failed`, error instanceof Error ? error.stack : String(error));
      throw mapPrivyError(error, context);
    }
  }

  private async findExistingPrivyUser(
    usersApi: ReturnType<ReturnType<PrivyService['getClient']>['users']>,
    userId: string,
    email: string | null,
  ): Promise<string | null> {
    try {
      const byCustomAuth = await usersApi.getByCustomAuthID({
        custom_user_id: userId,
      });
      return byCustomAuth.id;
    } catch {
      // User not found by custom auth id.
    }

    if (email) {
      try {
        const byEmail = await usersApi.getByEmailAddress({ address: email });
        return byEmail.id;
      } catch {
        // User not found by email.
      }
    }

    return null;
  }

  private toExternalId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  }

  private deriveTransactionHash(signedTransaction: string): string {
    return `0x${createHash('sha256').update(signedTransaction).digest('hex')}`;
  }
}
