-- AlterTable
ALTER TABLE "AiTrainingRun"
ADD COLUMN "battlegroundVersion" TEXT NOT NULL DEFAULT 'bg-v1',
ADD COLUMN "trainingModelVersion" TEXT NOT NULL DEFAULT 'dual-pawn-v1',
ADD COLUMN "compressedResults" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "AiTrainingRun_battlegroundVersion_trainingModelVersion_createdAt_idx"
ON "AiTrainingRun"("battlegroundVersion", "trainingModelVersion", "createdAt");
