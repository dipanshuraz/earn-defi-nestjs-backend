import {
  CallHandler,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { IdempotencyOperation } from './idempotency.constants';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;

  const reflectorMock = {
    get: jest.fn(),
  };

  const idempotencyServiceMock = {
    acquire: jest.fn(),
    complete: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn().mockReturnValue({
      ttlHours: 24,
      headerName: 'idempotency-key',
    }),
  };

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({
          statusCode: 200,
          status: jest.fn().mockReturnThis(),
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    interceptor = new IdempotencyInterceptor(
      reflectorMock as unknown as Reflector,
      idempotencyServiceMock as unknown as IdempotencyService,
      configServiceMock as unknown as ConfigService,
    );
  });

  it('passes through handlers without @Idempotent metadata', async () => {
    reflectorMock.get.mockReturnValue(undefined);

    const result = await lastValueFrom(
      interceptor.intercept(createContext({}), {
        handle: () => of({ ok: true }),
      } as CallHandler),
    );

    expect(result).toEqual({ ok: true });
    expect(idempotencyServiceMock.acquire).not.toHaveBeenCalled();
  });

  it('replays a stored response for deposit idempotency', async () => {
    reflectorMock.get.mockReturnValue({ operation: IdempotencyOperation.Deposit });
    idempotencyServiceMock.acquire.mockResolvedValue({
      replay: {
        statusCode: 201,
        responseData: { txHash: '0xabc' },
      },
      record: { id: 'record-1' },
    });

    const result = await lastValueFrom(
      interceptor.intercept(
        createContext({
          method: 'POST',
          path: '/earn/vaults/vault-1/deposit',
          route: { path: '/earn/vaults/:vaultId/deposit' },
          params: { vaultId: 'vault-1' },
          query: {},
          body: { amount: '1000000', walletId: 'wallet-1' },
          header: () => 'deposit-key-1',
          user: { userId: 'user-1', email: 'user@example.com' },
        }),
        {
          handle: () => of({ shouldNotRun: true }),
        } as CallHandler,
      ),
    );

    expect(result).toEqual({ txHash: '0xabc' });
    expect(idempotencyServiceMock.acquire).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'deposit-key-1',
        requestPath: 'POST /earn/vaults/:vaultId/deposit',
        userId: 'user-1',
      }),
    );
  });

  it('stores successful handler responses for approval idempotency', async () => {
    reflectorMock.get.mockReturnValue({ operation: IdempotencyOperation.Approval });
    idempotencyServiceMock.acquire.mockResolvedValue({
      replay: null,
      record: { id: 'record-1' },
    });

    const result = await lastValueFrom(
      interceptor.intercept(
        createContext({
          method: 'POST',
          path: '/earn/vaults/vault-1/approve',
          route: { path: '/earn/vaults/:vaultId/approve' },
          params: { vaultId: 'vault-1' },
          query: {},
          body: { walletId: 'wallet-1', amount: '1000000' },
          header: () => 'approval-key-1',
        }),
        {
          handle: () => of({ approved: true }),
        } as CallHandler,
      ),
    );

    expect(result).toEqual({ approved: true });
    expect(idempotencyServiceMock.complete).toHaveBeenCalledWith(
      'record-1',
      200,
      { approved: true },
    );
  });

  it('releases the idempotency lock when handler fails', async () => {
    reflectorMock.get.mockReturnValue({ operation: IdempotencyOperation.Withdrawal });
    idempotencyServiceMock.acquire.mockResolvedValue({
      replay: null,
      record: { id: 'record-1' },
    });

    await expect(
      lastValueFrom(
        interceptor.intercept(
          createContext({
            method: 'POST',
            path: '/earn/vaults/vault-1/withdraw',
            route: { path: '/earn/positions/:positionId/withdraw' },
            params: { vaultId: 'vault-1' },
            query: {},
            body: { amount: '1000000', walletId: 'wallet-1' },
            header: () => 'withdraw-key-1',
          }),
          {
            handle: () => throwError(() => new HttpException('bad request', 400)),
          } as CallHandler,
        ),
      ),
    ).rejects.toThrow(HttpException);

    expect(idempotencyServiceMock.complete).toHaveBeenCalledWith(
      'record-1',
      400,
      'bad request',
    );
  });
});
