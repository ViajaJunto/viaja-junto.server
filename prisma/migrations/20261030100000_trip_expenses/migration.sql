-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'EXACT', 'PROPORTIONAL');

-- CreateTable
CREATE TABLE "trip_expense" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "exchange_rate" DECIMAL(18,8),
    "description" TEXT,
    "spent_on" DATE,
    "split_type" "SplitType" NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_expense_share" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "weight" DECIMAL(18,6),
    "amount" INTEGER,

    CONSTRAINT "trip_expense_share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_expense_trip_id_spent_on_idx" ON "trip_expense"("trip_id", "spent_on");

-- CreateIndex
CREATE UNIQUE INDEX "trip_expense_share_expense_id_user_id_key" ON "trip_expense_share"("expense_id", "user_id");

-- AddForeignKey
ALTER TABLE "trip_expense" ADD CONSTRAINT "trip_expense_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense" ADD CONSTRAINT "trip_expense_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense" ADD CONSTRAINT "trip_expense_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense_share" ADD CONSTRAINT "trip_expense_share_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "trip_expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense_share" ADD CONSTRAINT "trip_expense_share_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

