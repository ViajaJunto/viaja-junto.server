-- AlterTable
ALTER TABLE "activity_catalog" ADD COLUMN     "destination_catalog_id" TEXT;

-- AlterTable
ALTER TABLE "destination_catalog" ADD COLUMN     "average_rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "destination_review" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "destination_catalog_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destination_review_user_id_destination_catalog_id_key" ON "destination_review"("user_id", "destination_catalog_id");

-- CreateIndex
CREATE INDEX "activity_catalog_destination_catalog_id_idx" ON "activity_catalog"("destination_catalog_id");

-- AddForeignKey
ALTER TABLE "activity_catalog" ADD CONSTRAINT "activity_catalog_destination_catalog_id_fkey" FOREIGN KEY ("destination_catalog_id") REFERENCES "destination_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_review" ADD CONSTRAINT "destination_review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_review" ADD CONSTRAINT "destination_review_destination_catalog_id_fkey" FOREIGN KEY ("destination_catalog_id") REFERENCES "destination_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: link existing activities to the destination they used to be matched
-- with by city (and country, when both are known). One destination per activity,
-- chosen deterministically.
UPDATE "activity_catalog" a
SET "destination_catalog_id" = m."destination_id"
FROM (
  SELECT DISTINCT ON (a2."id") a2."id" AS "activity_id", d."id" AS "destination_id"
  FROM "activity_catalog" a2
  JOIN "destination_catalog" d
    ON LOWER(BTRIM(a2."city")) = LOWER(BTRIM(d."name"))
   AND (
     d."country" IS NULL
     OR a2."country" IS NULL
     OR LOWER(BTRIM(a2."country")) = LOWER(BTRIM(d."country"))
   )
  ORDER BY a2."id", d."id"
) m
WHERE a."id" = m."activity_id";
