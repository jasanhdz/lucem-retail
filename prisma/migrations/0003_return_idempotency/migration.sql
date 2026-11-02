ALTER TABLE "Return" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Return" ADD COLUMN "requestHash" TEXT;

CREATE UNIQUE INDEX "Return_businessId_idempotencyKey_key" ON "Return"("businessId", "idempotencyKey");
