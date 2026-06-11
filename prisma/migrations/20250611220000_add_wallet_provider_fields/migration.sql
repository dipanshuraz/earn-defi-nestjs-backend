-- CreateEnum
CREATE TYPE "WalletProviderType" AS ENUM ('MOCK', 'PRIVY');

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN "provider_id" TEXT;
ALTER TABLE "wallets" ADD COLUMN "provider_type" "WalletProviderType" NOT NULL DEFAULT 'MOCK';

-- Backfill provider_id for any existing rows
UPDATE "wallets" SET "provider_id" = "id"::text WHERE "provider_id" IS NULL;

-- AlterTable
ALTER TABLE "wallets" ALTER COLUMN "provider_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "wallets_provider_id_idx" ON "wallets"("provider_id");
