-- Align idempotency model with enterprise response replay semantics.
ALTER TABLE "idempotency_keys" RENAME COLUMN "response_body" TO "response_data";

UPDATE "idempotency_keys"
SET "request_hash" = ''
WHERE "request_hash" IS NULL;

ALTER TABLE "idempotency_keys"
ALTER COLUMN "request_hash" SET NOT NULL;
