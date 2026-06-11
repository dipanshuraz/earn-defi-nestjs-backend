import {
  EarnProtocolName,
  GetVaultInput,
  GetVaultsInput,
  PreviewDepositInput,
  PreviewDepositResult,
  PreviewWithdrawInput,
  PreviewWithdrawResult,
  ProtocolVault,
} from './earn-protocol.types';

export const EARN_PROTOCOL_PROVIDER = Symbol('EARN_PROTOCOL_PROVIDER');

/**
 * Read-only abstraction for DeFi earn protocol integrations.
 * Implementations fetch vault data and preview conversions without submitting transactions.
 */
export interface EarnProtocolProvider {
  readonly protocol: EarnProtocolName;

  getVaults(input?: GetVaultsInput): Promise<ProtocolVault[]>;

  getVault(input: GetVaultInput): Promise<ProtocolVault>;

  previewDeposit(input: PreviewDepositInput): Promise<PreviewDepositResult>;

  previewWithdraw(input: PreviewWithdrawInput): Promise<PreviewWithdrawResult>;
}
