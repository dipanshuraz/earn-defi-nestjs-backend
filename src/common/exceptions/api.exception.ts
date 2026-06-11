import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorPayload {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export class ApiException extends HttpException {
  constructor(status: HttpStatus, payload: ApiErrorPayload) {
    super(payload, status);
  }

  getCode(): string {
    const response = this.getResponse();

    if (typeof response === 'object' && response !== null && 'code' in response) {
      return String((response as ApiErrorPayload).code);
    }

    return 'UNKNOWN_ERROR';
  }
}
