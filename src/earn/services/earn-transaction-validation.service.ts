import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Wallet } from '@prisma/client';
import {
  BlockchainConfig,
  ChainDefinition,
  ChainsConfig,
} from '../../config/config.types';
import { ProtocolVault } from '../../protocols/earn-protocol.types';
import { WalletsService } from '../../wallets/wallets.service';

@Injectable()
export class EarnTransactionValidationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly walletsService: WalletsService,
  ) {}

  async assertWalletBelongsToUser(userId: string, walletId: string): Promise<Wallet> {
    return this.walletsService.findOwnedWallet(userId, walletId);
  }

  assertChainMatchesEnvironment(chainId: number): void {
    const chain = this.getChainDefinition(chainId);
    const blockchain = this.getBlockchainConfig();

    if (!chain.isTestnet && !blockchain.allowMainnetTransactions) {
      throw new ForbiddenException(
        'Mainnet transactions are disabled. Set ALLOW_MAINNET_TRANSACTIONS=true to enable.',
      );
    }
  }

  assertVaultBelongsToChain(vault: ProtocolVault, chainId: number): void {
    if (vault.chainId !== chainId) {
      throw new BadRequestException(
        `Vault ${vault.vaultId} does not belong to chain ${chainId}`,
      );
    }
  }

  assertRpcBelongsToChain(chainId: number): void {
    const chain = this.getChainDefinition(chainId);

    if (!chain.rpcUrl || !chain.rpcUrl.startsWith('http')) {
      throw new BadRequestException(`RPC URL is not configured for chain ${chainId}`);
    }

    if (!chain.isEnabled) {
      throw new BadRequestException(`Chain ${chainId} is disabled`);
    }
  }

  assertWalletChainMatchesVault(wallet: Wallet, vault: ProtocolVault): void {
    if (wallet.chainId !== vault.chainId) {
      throw new BadRequestException(
        `Wallet chain ${wallet.chainId} does not match vault chain ${vault.chainId}`,
      );
    }
  }

  assertVaultActive(vault: ProtocolVault): void {
    if (!vault.isEnabled) {
      throw new BadRequestException({
        message: `Vault is not active: ${vault.vaultId}`,
        code: 'VAULT_DISABLED',
      });
    }
  }

  assertDepositEnabled(vault: ProtocolVault): void {
    this.assertVaultActive(vault);

    if (!vault.depositEnabled) {
      throw new BadRequestException({
        message: `Deposits are disabled for vault: ${vault.vaultId}`,
        code: 'VAULT_DEPOSIT_DISABLED',
      });
    }
  }

  assertWithdrawEnabled(vault: ProtocolVault): void {
    this.assertVaultActive(vault);

    if (!vault.withdrawEnabled) {
      throw new BadRequestException({
        message: `Withdrawals are disabled for vault: ${vault.vaultId}`,
        code: 'VAULT_WITHDRAW_DISABLED',
      });
    }
  }

  assertSufficientBalance(required: bigint, available: bigint): void {
    if (available < required) {
      throw new BadRequestException(
        `Insufficient balance: required ${required.toString()}, available ${available.toString()}`,
      );
    }
  }

  assertSufficientAllowance(required: bigint, available: bigint): void {
    if (available < required) {
      throw new BadRequestException(
        `Insufficient allowance: required ${required.toString()}, available ${available.toString()}`,
      );
    }
  }

  private getBlockchainConfig(): BlockchainConfig {
    const blockchain = this.configService.get<BlockchainConfig>('blockchain');

    if (!blockchain) {
      throw new Error('Blockchain configuration failed to load');
    }

    return blockchain;
  }

  private getChainDefinition(chainId: number): ChainDefinition {
    const chainsConfig = this.configService.get<ChainsConfig>('chains');

    if (!chainsConfig?.chains) {
      throw new Error('Chains configuration failed to load');
    }

    const chain = chainsConfig.chains.find((entry) => entry.chainId === chainId);

    if (!chain) {
      throw new BadRequestException(`Unsupported chainId: ${chainId}`);
    }

    return chain;
  }
}
