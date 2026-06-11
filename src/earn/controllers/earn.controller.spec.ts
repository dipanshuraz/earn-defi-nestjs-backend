import { Test, TestingModule } from '@nestjs/testing';
import { PositionStatus, TransactionStatus } from '@prisma/client';
import { EarnApprovalService } from '../services/earn-approval.service';
import { EarnDepositService } from '../services/earn-deposit.service';
import { EarnController } from './earn.controller';
import { EarnService } from '../services/earn.service';

describe('EarnController', () => {
  let controller: EarnController;

  const earnServiceMock = {
    listVaults: jest.fn(),
    getVault: jest.fn(),
    previewDeposit: jest.fn(),
  };

  const earnApprovalServiceMock = {
    approveVault: jest.fn(),
  };

  const earnDepositServiceMock = {
    depositVault: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EarnController],
      providers: [
        { provide: EarnService, useValue: earnServiceMock },
        { provide: EarnApprovalService, useValue: earnApprovalServiceMock },
        { provide: EarnDepositService, useValue: earnDepositServiceMock },
      ],
    }).compile();

    controller = module.get(EarnController);
  });

  it('lists vaults', async () => {
    earnServiceMock.listVaults.mockResolvedValue([
      { vaultId: 'aave-base-sepolia-usdc' },
    ]);

    const vaults = await controller.listVaults({ chainId: 84532 });

    expect(vaults).toHaveLength(1);
    expect(earnServiceMock.listVaults).toHaveBeenCalledWith({ chainId: 84532 });
  });

  it('returns a vault by id', async () => {
    earnServiceMock.getVault.mockResolvedValue({
      vaultId: 'aave-base-sepolia-usdc',
    });

    const vault = await controller.getVault('aave-base-sepolia-usdc', {});

    expect(vault.vaultId).toBe('aave-base-sepolia-usdc');
  });

  it('previews deposit for the authenticated user', async () => {
    earnServiceMock.previewDeposit.mockResolvedValue({
      vaultId: 'aave-base-sepolia-usdc',
      estimatedShares: '980392156862745098',
    });

    const preview = await controller.previewDeposit(
      { userId: 'user-1', email: 'user@example.com' },
      'aave-base-sepolia-usdc',
      { walletId: 'wallet-1', amount: '1000000' },
    );

    expect(preview.estimatedShares).toBe('980392156862745098');
    expect(earnServiceMock.previewDeposit).toHaveBeenCalledWith(
      'user-1',
      'aave-base-sepolia-usdc',
      { walletId: 'wallet-1', amount: '1000000' },
    );
  });

  it('approves vault spending for the authenticated user', async () => {
    earnApprovalServiceMock.approveVault.mockResolvedValue({
      vaultId: 'aave-base-sepolia-usdc',
      status: TransactionStatus.CONFIRMED,
      transactionId: 'tx-1',
    });

    const result = await controller.approveVault(
      { userId: 'user-1', email: 'user@example.com' },
      'aave-base-sepolia-usdc',
      { walletId: 'wallet-1', amount: '1000000' },
    );

    expect(result.status).toBe(TransactionStatus.CONFIRMED);
    expect(earnApprovalServiceMock.approveVault).toHaveBeenCalledWith(
      'user-1',
      'aave-base-sepolia-usdc',
      { walletId: 'wallet-1', amount: '1000000' },
    );
  });

  it('submits deposit for the authenticated user', async () => {
    earnDepositServiceMock.depositVault.mockResolvedValue({
      vaultId: 'aave-base-sepolia-usdc',
      status: TransactionStatus.CONFIRMED,
      positionStatus: PositionStatus.ACTIVE,
    });

    const result = await controller.depositVault(
      { userId: 'user-1', email: 'user@example.com' },
      'aave-base-sepolia-usdc',
      { walletId: 'wallet-1', amount: '1000000' },
    );

    expect(result.status).toBe(TransactionStatus.CONFIRMED);
    expect(earnDepositServiceMock.depositVault).toHaveBeenCalledWith(
      'user-1',
      'aave-base-sepolia-usdc',
      { walletId: 'wallet-1', amount: '1000000' },
    );
  });
});
