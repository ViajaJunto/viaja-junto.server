-- The average rating and the number of reviews of a catalog activity are
-- derived from its reviews and kept in sync by the application, in the same
-- transaction that creates, edits or deletes a review.
ALTER TABLE "activity_catalog" ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill from the reviews that already exist (average rounded to 2 decimals).
UPDATE "activity_catalog" AS a
SET "review_count" = r."count",
    "average_rating" = r."average"
FROM (
  SELECT "activity_catalog_id" AS "id",
         COUNT(*)::int AS "count",
         ROUND(AVG("rating")::numeric, 2)::double precision AS "average"
  FROM "review"
  GROUP BY "activity_catalog_id"
) AS r
WHERE a."id" = r."id";

-- Without reviews there is no rating. Any value typed in by hand before this
-- migration was never backed by a review, so it is cleared.
UPDATE "activity_catalog" SET "average_rating" = NULL WHERE "review_count" = 0;
