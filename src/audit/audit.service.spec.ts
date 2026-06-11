import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const prismaMock = {
    auditLog: {
      create: jest.fn(),
    },
  };

  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditService(prismaMock as never);
  });

  it('persists audit events', async () => {
    await service.log({
      userId: 'user-1',
      action: AuditAction.WALLET_CREATED,
      entityType: 'wallet',
      entityId: 'wallet-1',
      metadata: { chainId: 84532 },
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: AuditAction.WALLET_CREATED,
          entityType: 'wallet',
          entityId: 'wallet-1',
        }),
      }),
    );
  });

  it('does not throw when persistence fails', async () => {
    prismaMock.auditLog.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.log({
        action: AuditAction.USER_LOGIN,
        entityType: 'user',
        entityId: 'user-1',
      }),
    ).resolves.toBeUndefined();
  });
});
