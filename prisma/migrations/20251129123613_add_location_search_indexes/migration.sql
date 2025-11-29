-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "latitude" REAL;
ALTER TABLE "Listing" ADD COLUMN "longitude" REAL;

-- CreateIndex
CREATE INDEX "Listing_bedrooms_idx" ON "Listing"("bedrooms");

-- CreateIndex
CREATE INDEX "Listing_maxGuests_idx" ON "Listing"("maxGuests");

-- CreateIndex
CREATE INDEX "Listing_latitude_longitude_idx" ON "Listing"("latitude", "longitude");
