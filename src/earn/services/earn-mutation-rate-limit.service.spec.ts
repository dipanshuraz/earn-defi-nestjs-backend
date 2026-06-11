import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EarnMutationRateLimitService } from './earn-mutation-rate-limit.service';

describe('EarnMutationRateLimitService', () => {
  const redisMock = {
    incr: jest.fn(),
    expire: jest.fn(),
  };

  const redisServiceMock = {
    getClient: jest.fn(() => redisMock),
  };

  const configServiceMock = {
    get: jest.fn(() => ({
      maxDepositsPerMinute: 2,
      maxWithdrawalsPerMinute: 2,
    })),
  };

  let service: EarnMutationRateLimitService;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.incr.mockResolvedValue(1);
    service = new EarnMutationRateLimitService(
      redisServiceMock as never,
      configServiceMock as unknown as ConfigService,
    );
  });

  it('allows requests under the per-minute limit', async () => {
    await expect(service.assertDepositAllowed('user-1')).resolves.toBeUndefined();
    expect(redisMock.expire).toHaveBeenCalledWith(expect.any(String), 60);
  });

  it('rejects requests above the per-minute limit', async () => {
    redisMock.incr.mockResolvedValue(3);

    await expect(service.assertDepositAllowed('user-1')).rejects.toBeInstanceOf(HttpException);
  });
});
