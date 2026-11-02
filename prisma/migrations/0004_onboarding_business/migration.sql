-- CreateEnum
CREATE TYPE "BusinessGiro" AS ENUM ('ROPA', 'PAPELERIA', 'ABARROTES', 'FERRETERIA', 'BELLEZA', 'HOGAR', 'ELECTRONICA', 'SERVICIOS', 'OTRO');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "branchName" TEXT NOT NULL DEFAULT 'Sucursal principal';
ALTER TABLE "Business" ADD COLUMN "giro" "BusinessGiro" NOT NULL DEFAULT 'OTRO';

-- CreateTable
CREATE TABLE "BusinessCreationIdempotency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessCreationIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCreationIdempotency_businessId_key" ON "BusinessCreationIdempotency"("businessId");
CREATE UNIQUE INDEX "BusinessCreationIdempotency_userId_key_key" ON "BusinessCreationIdempotency"("userId", "key");

-- AddForeignKey
ALTER TABLE "BusinessCreationIdempotency" ADD CONSTRAINT "BusinessCreationIdempotency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessCreationIdempotency" ADD CONSTRAINT "BusinessCreationIdempotency_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
