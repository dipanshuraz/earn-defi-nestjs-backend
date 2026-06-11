-- AlterTable
ALTER TABLE "users" ALTER COLUMN "privy_user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
