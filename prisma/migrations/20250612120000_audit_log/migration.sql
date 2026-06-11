-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
  'USER_REGISTERED',
  'USER_LOGIN',
  'WALLET_CREATED',
  'APPROVAL_REQUESTED',
  'APPROVAL_CONFIRMED',
  'DEPOSIT_REQUESTED',
  'DEPOSIT_CONFIRMED',
  'WITHDRAW_REQUESTED',
  'WITHDRAW_CONFIRMED'
);

-- CreateTable
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "action" "AuditAction" NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
