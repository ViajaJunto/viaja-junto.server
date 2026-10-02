-- Google is now the only way to sign in: passwords are no longer stored.
ALTER TABLE "user" DROP COLUMN "password_hash",
ADD COLUMN     "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_google_id_key" ON "user"("google_id");
