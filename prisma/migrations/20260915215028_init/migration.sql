-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'CONFIRMED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MemberPermission" AS ENUM ('EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "DestinationCategory" AS ENUM ('CITY', 'BEACH', 'NATURE', 'CULTURAL');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('TOUR', 'FOOD', 'LODGING', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "TripActivityStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNING',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_member" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" "MemberPermission" NOT NULL DEFAULT 'VIEWER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "category" "DestinationCategory",
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photo_url" TEXT,

    CONSTRAINT "destination_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_destination" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "destination_catalog_id" TEXT NOT NULL,
    "arrival" DATE,
    "departure" DATE,
    "description" TEXT,
    "display_order" INTEGER,

    CONSTRAINT "trip_destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ActivityType" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "google_place_id" TEXT,
    "photo_url" TEXT,
    "source" TEXT,
    "average_rating" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_activity" (
    "id" TEXT NOT NULL,
    "trip_destination_id" TEXT NOT NULL,
    "activity_catalog_id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "expected_cost" DOUBLE PRECISION,
    "status" "TripActivityStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "trip_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "total_value" DOUBLE PRECISION NOT NULL,
    "planned_activities" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_catalog_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trip_member_trip_id_user_id_key" ON "trip_member"("trip_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_trip_id_key" ON "budget"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_user_id_activity_catalog_id_key" ON "review"("user_id", "activity_catalog_id");

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_member" ADD CONSTRAINT "trip_member_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_member" ADD CONSTRAINT "trip_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_destination" ADD CONSTRAINT "trip_destination_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_destination" ADD CONSTRAINT "trip_destination_destination_catalog_id_fkey" FOREIGN KEY ("destination_catalog_id") REFERENCES "destination_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activity" ADD CONSTRAINT "trip_activity_trip_destination_id_fkey" FOREIGN KEY ("trip_destination_id") REFERENCES "trip_destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activity" ADD CONSTRAINT "trip_activity_activity_catalog_id_fkey" FOREIGN KEY ("activity_catalog_id") REFERENCES "activity_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget" ADD CONSTRAINT "budget_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_activity_catalog_id_fkey" FOREIGN KEY ("activity_catalog_id") REFERENCES "activity_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
