import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

interface PrivyLikeError extends Error {
  status?: number;
}

export function mapPrivyError(error: unknown, context: string): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  if (isPrivyLikeError(error, 'NotFoundError', 404)) {
    return new NotFoundException(`${context}: wallet not found`);
  }

  if (isPrivyLikeError(error, 'AuthenticationError', 401)) {
    return new UnauthorizedException(`${context}: Privy authentication failed`);
  }

  if (isPrivyLikeError(error, 'PermissionDeniedError', 403)) {
    return new ForbiddenException(`${context}: Privy permission denied`);
  }

  if (isPrivyLikeError(error, 'ConflictError', 409)) {
    return new ConflictException(`${context}: Privy resource conflict`);
  }

  if (isPrivyLikeError(error, 'UnprocessableEntityError', 422)) {
    return new UnprocessableEntityException(`${context}: invalid Privy request`);
  }

  if (isPrivyLikeError(error, 'RateLimitError', 429)) {
    return new ServiceUnavailableException(`${context}: Privy rate limit exceeded`);
  }

  if (isPrivyLikeError(error, 'APIConnectionTimeoutError')) {
    return new GatewayTimeoutException(`${context}: Privy request timed out`);
  }

  if (isPrivyLikeError(error, 'APIConnectionError')) {
    return new BadGatewayException(`${context}: Privy connection failed`);
  }

  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (message.includes('No valid authorization keys')) {
    return new BadRequestException(
      `${context}: Privy rejected the wallet transaction signature. Ensure PRIVY_AUTHORIZATION_PRIVATE_KEY and PRIVY_WALLET_SIGNER_KEY_QUORUM_ID match the same key pair in Privy Dashboard, restart the server, then create a new wallet via POST /api/v1/wallets (see docs/privy-server-signing.md).`,
    );
  }

  if (status !== undefined && status >= 500) {
    return new BadGatewayException(`${context}: Privy upstream error`);
  }

  if (status !== undefined && status >= 400) {
    return new BadRequestException(`${context}: Privy request failed`);
  }

  return new BadGatewayException(`${context}: unexpected Privy wallet error`);
}

function isPrivyLikeError(
  error: unknown,
  name: string,
  status?: number,
): error is PrivyLikeError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as PrivyLikeError;

  if (candidate.name !== name) {
    return false;
  }

  if (status === undefined) {
    return true;
  }

  return candidate.status === status;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = Number((error as { status?: number }).status);

  return Number.isFinite(status) ? status : undefined;
}
