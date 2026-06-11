import { AuditAction } from '@prisma/client';

export interface AuditLogInput {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export { AuditAction };
