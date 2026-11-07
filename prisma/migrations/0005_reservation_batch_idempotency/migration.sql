CREATE TABLE "ReservationBatchIdempotency" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "reservationIds" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReservationBatchIdempotency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReservationBatchIdempotency_businessId_key_key" ON "ReservationBatchIdempotency"("businessId", "key");
ALTER TABLE "ReservationBatchIdempotency" ADD CONSTRAINT "ReservationBatchIdempotency_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
