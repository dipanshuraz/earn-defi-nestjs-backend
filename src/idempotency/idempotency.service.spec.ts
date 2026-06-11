import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  IdempotencyConflictException,
  IdempotencyInProgressException,
} from './exceptions/idempotency.exceptions';
import { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  const repositoryMock = {
    findByKeyAndPath: jest.fn(),
    create: jest.fn(),
    saveResponse: jest.fn(),
    deleteById: jest.fn(),
    toRecord: jest.fn((record) => ({
      id: record.id,
      key: record.key,
      requestHash: record.requestHash,
      responseData: record.responseData,
      createdAt: record.createdAt,
    })),
  };

  const fingerprint = {
    method: 'POST',
    path: '/earn/vaults/:vaultId/deposit',
    params: { vaultId: 'vault-1' },
    query: {},
    body: { amount: '1000000', walletId: 'wallet-1' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: IdempotencyRepository,
          useValue: repositoryMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              ttlHours: 24,
              headerName: 'idempotency-key',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(IdempotencyService);
  });

  it('creates a new idempotency record when key is unseen', async () => {
    repositoryMock.findByKeyAndPath.mockResolvedValue(null);
    repositoryMock.create.mockResolvedValue({
      id: 'record-1',
      key: 'key-1',
      requestHash: service.buildRequestHash(fingerprint),
      responseData: null,
      createdAt: new Date(),
    });

    const result = await service.acquire({
      key: 'key-1',
      requestPath: 'POST /earn/vaults/:vaultId/deposit',
      fingerprint,
      userId: 'user-1',
    });

    expect(result.replay).toBeNull();
    expect(result.record.id).toBe('record-1');
  });

  it('replays stored responses for the same key and request hash', async () => {
    const requestHash = service.buildRequestHash(fingerprint);

    repositoryMock.findByKeyAndPath.mockResolvedValue({
      id: 'record-1',
      key: 'key-1',
      requestHash,
      responseData: { txHash: '0xabc' },
      statusCode: 201,
      createdAt: new Date(),
    });

    const result = await service.acquire({
      key: 'key-1',
      requestPath: 'POST /earn/vaults/:vaultId/deposit',
      fingerprint,
    });

    expect(result.replay).toEqual({
      statusCode: 201,
      responseData: { txHash: '0xabc' },
    });
  });

  it('rejects the same key with a different request hash', async () => {
    repositoryMock.findByKeyAndPath.mockResolvedValue({
      id: 'record-1',
      key: 'key-1',
      requestHash: 'different-hash',
      responseData: { txHash: '0xabc' },
      statusCode: 201,
      createdAt: new Date(),
    });

    await expect(
      service.acquire({
        key: 'key-1',
        requestPath: 'POST /earn/vaults/:vaultId/deposit',
        fingerprint,
      }),
    ).rejects.toThrow(IdempotencyConflictException);
  });

  it('rejects concurrent retries while the original request is in progress', async () => {
    const requestHash = service.buildRequestHash(fingerprint);

    repositoryMock.findByKeyAndPath.mockResolvedValue({
      id: 'record-1',
      key: 'key-1',
      requestHash,
      responseData: null,
      statusCode: null,
      createdAt: new Date(),
    });

    await expect(
      service.acquire({
        key: 'key-1',
        requestPath: 'POST /earn/vaults/:vaultId/deposit',
        fingerprint,
      }),
    ).rejects.toThrow(IdempotencyInProgressException);
  });

  it('stores only successful responses and releases failed attempts', async () => {
    await service.complete('record-1', 201, { txHash: '0xabc' });
    await service.complete('record-2', 500, { message: 'failed' });

    expect(repositoryMock.saveResponse).toHaveBeenCalledWith(
      'record-1',
      { txHash: '0xabc' },
      201,
    );
    expect(repositoryMock.deleteById).toHaveBeenCalledWith('record-2');
    expect(repositoryMock.saveResponse).not.toHaveBeenCalledWith(
      'record-2',
      expect.anything(),
      500,
    );
  });

  it('retries lookup after a unique-key race on create', async () => {
    const requestHash = service.buildRequestHash(fingerprint);
    const raceError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '6.0.0',
    });

    repositoryMock.findByKeyAndPath
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'record-1',
        key: 'key-1',
        requestHash,
        responseData: { txHash: '0xabc' },
        statusCode: 201,
        createdAt: new Date(),
      });
    repositoryMock.create.mockRejectedValue(raceError);

    const result = await service.acquire({
      key: 'key-1',
      requestPath: 'POST /earn/vaults/:vaultId/deposit',
      fingerprint,
    });

    expect(result.replay?.responseData).toEqual({ txHash: '0xabc' });
  });
});
