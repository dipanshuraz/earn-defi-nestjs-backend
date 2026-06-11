import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyRepository } from './idempotency.repository';

describe('IdempotencyRepository', () => {
  let repository: IdempotencyRepository;

  const prismaMock = {
    idempotencyKey: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get(IdempotencyRepository);
  });

  it('finds records by key and request path', async () => {
    prismaMock.idempotencyKey.findUnique.mockResolvedValue({
      id: 'record-1',
      key: 'key-1',
      requestPath: 'POST /earn/vaults/:vaultId/deposit',
      requestHash: 'hash-1',
      responseData: { ok: true },
      statusCode: 201,
      createdAt: new Date(),
    });

    const record = await repository.findByKeyAndPath(
      'key-1',
      'POST /earn/vaults/:vaultId/deposit',
    );

    expect(record?.id).toBe('record-1');
  });

  it('persists successful responses', async () => {
    prismaMock.idempotencyKey.update.mockResolvedValue({ id: 'record-1' });

    await repository.saveResponse('record-1', { txHash: '0xabc' }, 201);

    expect(prismaMock.idempotencyKey.update).toHaveBeenCalledWith({
      where: { id: 'record-1' },
      data: {
        responseData: { txHash: '0xabc' },
        statusCode: 201,
      },
    });
  });
});
