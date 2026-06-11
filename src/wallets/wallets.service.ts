import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Wallet, WalletProviderType, WalletType } from '@prisma/client';
import { encodeFunctionData, getAddress, parseAbi } from 'viem';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppConfig, BlockchainConfig } from '../config/config.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  AAVE_BASE_SEPOLIA_FAUCET,
  AAVE_BASE_SEPOLIA_TEST_USDC,
  AAVE_FAUCET_MINT_AMOUNT,
} from './constants/aave-faucet.constants';
import { MintTestUsdcResponseDto } from './dto/mint-test-usdc-response.dto';
import { CreateWalletDto, WalletBalanceDto, WalletResponseDto } from './dto/wallet.dto';
import {
  WALLET_PROVIDER,
  WalletProvider,
} from './providers/wallet-provider.interface';

const WALLET_PUBLIC_SELECT = {
  id: true,
  address: true,
  chainId: true,
  walletType: true,
  providerId: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
} as const;

type WalletRecord = Pick<
  Wallet,
  | 'id'
  | 'address'
  | 'chainId'
  | 'walletType'
  | 'providerId'
  | 'isPrimary'
  | 'createdAt'
  | 'updatedAt'
>;

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(WALLET_PROVIDER) private readonly walletProvider: WalletProvider,
    private readonly auditService: AuditService,
  ) {}

  async createWallet(
    userId: string,
    dto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    const blockchain = this.getBlockchainConfig();
    const chainId = dto.chainId ?? blockchain.chainId;
    const isPrimary = dto.isPrimary ?? (await this.countUserWallets(userId)) === 0;

    if (isPrimary) {
      await this.clearPrimaryWallet(userId);
    }

    const privyUserId = await this.walletProvider.ensurePrivyUserId(userId);

    const providerWallet = await this.walletProvider.createWallet({
      userId,
      chainId,
      privyUserId,
    });

    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        address: providerWallet.address,
        chainId: providerWallet.chainId,
        walletType: WalletType.EMBEDDED,
        providerId: providerWallet.providerWalletId,
        providerType: WalletProviderType.PRIVY,
        isPrimary,
      },
      select: WALLET_PUBLIC_SELECT,
    });

    await this.auditService.log({
      userId,
      action: AuditAction.WALLET_CREATED,
      entityType: 'wallet',
      entityId: wallet.id,
      metadata: {
        address: wallet.address,
        chainId: wallet.chainId,
        providerType: WalletProviderType.PRIVY,
      },
    });

    return this.toPublicWallet(wallet);
  }

  async listWallets(userId: string): Promise<WalletResponseDto[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId },
      select: WALLET_PUBLIC_SELECT,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return Promise.all(wallets.map((wallet) => this.attachBalances(wallet)));
  }

  async getWallet(userId: string, walletId: string): Promise<WalletResponseDto> {
    const wallet = await this.findOwnedWalletRecord(userId, walletId);
    return this.attachBalances(wallet);
  }

  async findOwnedWallet(userId: string, walletId: string): Promise<Wallet> {
    return this.findOwnedWalletRecord(userId, walletId);
  }

  async enableServerSigning(userId: string, walletId: string): Promise<WalletResponseDto> {
    const wallet = await this.findOwnedWalletRecord(userId, walletId);
    await this.walletProvider.ensureWalletServerSigner(wallet.providerId);
    return this.attachBalances(wallet);
  }

  async mintAaveTestUsdc(
    userId: string,
    walletId: string,
  ): Promise<MintTestUsdcResponseDto> {
    this.assertFaucetEnabled();

    const wallet = await this.findOwnedWalletRecord(userId, walletId);

    if (wallet.chainId !== 84532) {
      throw new BadRequestException(
        'Aave test USDC faucet is only available on Base Sepolia (chainId 84532)',
      );
    }

    const data = encodeFunctionData({
      abi: parseAbi([
        'function mint(address token, address to, uint256 amount) returns (uint256)',
      ]),
      functionName: 'mint',
      args: [AAVE_BASE_SEPOLIA_TEST_USDC, getAddress(wallet.address), AAVE_FAUCET_MINT_AMOUNT],
    });

    const broadcast = await this.walletProvider.sendTransaction({
      providerWalletId: wallet.providerId,
      chainId: wallet.chainId,
      to: AAVE_BASE_SEPOLIA_FAUCET,
      data,
    });

    return {
      walletId: wallet.id,
      walletAddress: wallet.address,
      chainId: wallet.chainId,
      assetAddress: AAVE_BASE_SEPOLIA_TEST_USDC,
      amount: AAVE_FAUCET_MINT_AMOUNT.toString(),
      txHash: broadcast.hash,
    };
  }

  private async findOwnedWalletRecord(
    userId: string,
    walletId: string,
  ): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  private async countUserWallets(userId: string): Promise<number> {
    return this.prisma.wallet.count({ where: { userId } });
  }

  private async clearPrimaryWallet(userId: string): Promise<void> {
    await this.prisma.wallet.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  private getBlockchainConfig(): BlockchainConfig {
    const blockchain = this.configService.get<BlockchainConfig>('blockchain');

    if (!blockchain) {
      throw new Error('Blockchain configuration failed to load');
    }

    return blockchain;
  }

  private assertFaucetEnabled(): void {
    const app = this.configService.get<AppConfig>('app');
    const nodeEnv = app?.nodeEnv ?? 'development';
    const faucetEnabled = process.env.FAUCET_ENABLED === 'true';

    if (!faucetEnabled && !['local', 'development', 'test'].includes(nodeEnv)) {
      throw new ForbiddenException(
        'Testnet faucet is disabled. Set FAUCET_ENABLED=true or run in local/dev.',
      );
    }
  }

  private async attachBalances(wallet: WalletRecord): Promise<WalletResponseDto> {
    const publicWallet = this.toPublicWallet(wallet);

    try {
      const balances = await this.walletProvider.getBalances(
        wallet.providerId,
        wallet.chainId,
      );

      return {
        ...publicWallet,
        balances,
        balance: this.findEthBalance(balances),
      };
    } catch (error) {
      this.logger.warn(
        `Balance lookup failed for wallet ${wallet.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return publicWallet;
    }
  }

  private findEthBalance(balances: WalletBalanceDto[]): WalletBalanceDto | undefined {
    return balances.find((entry) => entry.symbol === 'ETH');
  }

  private toPublicWallet(wallet: WalletRecord): WalletResponseDto {
    return {
      walletId: wallet.id,
      privyWalletId: wallet.providerId,
      walletAddress: wallet.address,
      chainId: wallet.chainId,
      walletType: wallet.walletType,
      isPrimary: wallet.isPrimary,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
