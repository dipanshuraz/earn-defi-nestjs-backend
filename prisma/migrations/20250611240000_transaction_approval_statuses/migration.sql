-- Add APPROVAL transaction type
ALTER TYPE "TransactionType" ADD VALUE 'APPROVAL';

-- Replace transaction status lifecycle enum
CREATE TYPE "TransactionStatus_new" AS ENUM ('CREATED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'REVERTED');

ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "transactions"
ALTER COLUMN "status" TYPE "TransactionStatus_new"
USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'CREATED'
    ELSE "status"::text
  END
)::"TransactionStatus_new";

ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'CREATED';

DROP TYPE "TransactionStatus";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
