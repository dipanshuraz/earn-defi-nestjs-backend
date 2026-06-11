import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { BullmqRedisService } from '../redis/bullmq-redis.service';
import { TRANSACTION_RECONCILIATION_JOB } from './reconciliation.constants';
import { TransactionReconciliationProcessor } from './transaction-reconciliation.processor';
import { TransactionReconciliationService } from './transaction-reconciliation.service';

describe('TransactionReconciliationProcessor', () => {
  let processor: TransactionReconciliationProcessor;

  const bullmqRedisServiceMock = {
    isQueueEnabled: jest.fn(),
    getConnectionOptions: jest.fn(),
  };

  const reconciliationServiceMock = {
    reconcilePendingTransactions: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    bullmqRedisServiceMock.isQueueEnabled.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionReconciliationProcessor,
        { provide: BullmqRedisService, useValue: bullmqRedisServiceMock },
        {
          provide: TransactionReconciliationService,
          useValue: reconciliationServiceMock,
        },
      ],
    }).compile();

    processor = module.get(TransactionReconciliationProcessor);
    processor.onModuleInit();
  });

  it('does not start the worker when queue is disabled', () => {
    expect(bullmqRedisServiceMock.getConnectionOptions).not.toHaveBeenCalled();
  });

  it('processes reconciliation jobs', async () => {
    const localProcessor = new TransactionReconciliationProcessor(
      bullmqRedisServiceMock as unknown as BullmqRedisService,
      reconciliationServiceMock as unknown as TransactionReconciliationService,
    );

    const job = {
      id: 'job-1',
      name: TRANSACTION_RECONCILIATION_JOB,
    } as Job;

    await (
      localProcessor as unknown as {
        processJob: (job: Job) => Promise<void>;
      }
    ).processJob(job);

    expect(reconciliationServiceMock.reconcilePendingTransactions).toHaveBeenCalled();
  });
});
