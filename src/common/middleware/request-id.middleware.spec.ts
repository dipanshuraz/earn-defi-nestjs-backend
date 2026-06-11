import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  const middleware = new RequestIdMiddleware();

  it('generates a request id when the header is missing', () => {
    const req = {
      header: jest.fn().mockReturnValue(undefined),
      requestId: undefined,
    } as unknown as import('express').Request;
    const res = {
      setHeader: jest.fn(),
    } as unknown as import('express').Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toEqual(expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('reuses an incoming request id header', () => {
    const req = {
      header: jest.fn().mockReturnValue('corr-123'),
      requestId: undefined,
    } as unknown as import('express').Request;
    const res = {
      setHeader: jest.fn(),
    } as unknown as import('express').Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toBe('corr-123');
  });
});
