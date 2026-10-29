-- Invite code: a short, human-shareable code the trip creator hands out so
-- other users can join (FR18). Added nullable so existing trips can be
-- backfilled before the column becomes required.
ALTER TABLE "trip" ADD COLUMN     "invite_code" TEXT;

-- Backfill: 8 characters from an alphabet without look-alikes (no I, L, O,
-- 0, 1). The subquery reads "trip"."id" so it is evaluated once per row.
UPDATE "trip"
SET "invite_code" = (
  SELECT string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
    ''
  )
  FROM generate_series(1, 8) AS position
  WHERE "trip"."id" IS NOT NULL
);

ALTER TABLE "trip" ALTER COLUMN "invite_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "trip_invite_code_key" ON "trip"("invite_code");
