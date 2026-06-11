import { SetMetadata } from '@nestjs/common';
import { IDEMPOTENT_METADATA_KEY } from '../idempotency.constants';
import { IdempotentOptions } from '../idempotency.types';

export const Idempotent = (options: IdempotentOptions) =>
  SetMetadata(IDEMPOTENT_METADATA_KEY, options);
