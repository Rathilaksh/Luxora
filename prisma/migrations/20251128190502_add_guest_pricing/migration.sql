-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "address" TEXT,
    "price" INTEGER NOT NULL,
    "image" TEXT,
    "roomType" TEXT NOT NULL DEFAULT 'ENTIRE_PLACE',
    "bedrooms" INTEGER NOT NULL DEFAULT 1,
    "bathrooms" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER NOT NULL DEFAULT 2,
    "baseGuests" INTEGER NOT NULL DEFAULT 2,
    "extraGuestFee" INTEGER NOT NULL DEFAULT 0,
    "hostId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("address", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "hostId", "id", "image", "maxGuests", "price", "roomType", "title", "updatedAt") SELECT "address", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "hostId", "id", "image", "maxGuests", "price", "roomType", "title", "updatedAt" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_city_idx" ON "Listing"("city");
CREATE INDEX "Listing_price_idx" ON "Listing"("price");
CREATE INDEX "Listing_hostId_idx" ON "Listing"("hostId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
