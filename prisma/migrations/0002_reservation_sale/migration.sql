ALTER TABLE "Reservation" ADD COLUMN "saleId" TEXT;

CREATE UNIQUE INDEX "Reservation_saleId_key" ON "Reservation"("saleId");

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
