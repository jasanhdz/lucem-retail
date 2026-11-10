CREATE TABLE "AbuseRateLimitBucket" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "keyHash" CHAR(64) NOT NULL,
  "windowStart" TIMESTAMPTZ(6) NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "AbuseRateLimitBucket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AbuseRateLimitBucket_hash_length" CHECK (length("keyHash") = 64),
  CONSTRAINT "AbuseRateLimitBucket_count_positive" CHECK ("count" > 0)
);
CREATE UNIQUE INDEX "AbuseRateLimitBucket_keyHash_windowStart_key" ON "AbuseRateLimitBucket"("keyHash", "windowStart");
CREATE INDEX "AbuseRateLimitBucket_expiresAt_keyHash_idx" ON "AbuseRateLimitBucket"("expiresAt", "keyHash");

CREATE TABLE "UploadQuotaCounter" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "businessId" TEXT,
  "scope" VARCHAR(8) NOT NULL,
  "usedBytes" BIGINT NOT NULL DEFAULT 0,
  "reservedBytes" BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT "UploadQuotaCounter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UploadQuotaCounter_scope_business_check" CHECK (("scope" = 'GLOBAL' AND "businessId" IS NULL) OR ("scope" = 'BUSINESS' AND "businessId" IS NOT NULL)),
  CONSTRAINT "UploadQuotaCounter_used_nonnegative" CHECK ("usedBytes" >= 0),
  CONSTRAINT "UploadQuotaCounter_reserved_nonnegative" CHECK ("reservedBytes" >= 0),
  CONSTRAINT "UploadQuotaCounter_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UploadQuotaCounter_businessId_key" ON "UploadQuotaCounter"("businessId");
CREATE UNIQUE INDEX "UploadQuotaCounter_one_global_key" ON "UploadQuotaCounter"("scope") WHERE "scope" = 'GLOBAL';
CREATE INDEX "UploadQuotaCounter_scope_idx" ON "UploadQuotaCounter"("scope");
