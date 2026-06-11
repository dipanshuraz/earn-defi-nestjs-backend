import { Injectable } from '@nestjs/common';
import { PrivyWalletService } from './privy-wallet.service';
import {
  BroadcastTransaction,
  CreateWalletInput,
  ProviderWallet,
  SendTransactionInput,
  SignTransactionInput,
  SignedTransaction,
  WalletBalance,
  WalletProvider,
} from '../wallet-provider.interface';

@Injectable()
export class PrivyWalletProvider implements WalletProvider {
  readonly providerType = 'privy' as const;

  constructor(private readonly privyWalletService: PrivyWalletService) {}

  ensurePrivyUserId(userId: string): Promise<string> {
    return this.privyWalletService.ensurePrivyUserId(userId);
  }

  createWallet(input: CreateWalletInput): Promise<ProviderWallet> {
    return this.privyWalletService.createWallet(input);
  }

  getWallet(providerWalletId: string): Promise<ProviderWallet> {
    return this.privyWalletService.getWallet(providerWalletId, 0);
  }

  getBalance(providerWalletId: string, chainId: number): Promise<WalletBalance> {
    return this.privyWalletService.getBalance(providerWalletId, chainId);
  }

  getBalances(providerWalletId: string, chainId: number): Promise<WalletBalance[]> {
    return this.privyWalletService.getBalances(providerWalletId, chainId);
  }

  ensureWalletServerSigner(providerWalletId: string): Promise<void> {
    return this.privyWalletService.ensureWalletServerSigner(providerWalletId);
  }

  signTransaction(input: SignTransactionInput): Promise<SignedTransaction> {
    return this.privyWalletService.prepareTransactionSigning(input);
  }

  sendTransaction(input: SendTransactionInput): Promise<BroadcastTransaction> {
    return this.privyWalletService.sendTransaction(input);
  }
}
