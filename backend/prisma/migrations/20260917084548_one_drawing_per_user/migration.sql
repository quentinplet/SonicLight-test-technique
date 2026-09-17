-- DropIndex
DROP INDEX "drawings_userId_createdAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "drawings_userId_key" ON "drawings"("userId");

