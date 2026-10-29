-- AlterTable
ALTER TABLE "activity_catalog" ADD COLUMN     "external_id" TEXT;

-- AlterTable
ALTER TABLE "destination_catalog" ADD COLUMN     "external_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "activity_catalog_external_id_key" ON "activity_catalog"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "destination_catalog_external_id_key" ON "destination_catalog"("external_id");

