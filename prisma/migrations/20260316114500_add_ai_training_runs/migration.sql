-- CreateTable
CREATE TABLE "AiTrainingRun" (
    "id" SERIAL NOT NULL,
    "runId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "datasetSize" INTEGER NOT NULL,
    "epochs" INTEGER NOT NULL,
    "learningRate" DOUBLE PRECISION NOT NULL,
    "trainingLoss" DOUBLE PRECISION NOT NULL,
    "validationLoss" DOUBLE PRECISION NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "modelAWeights" JSONB NOT NULL,
    "modelBWeights" JSONB NOT NULL,
    "logs" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTrainingRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiTrainingRun_runId_key" ON "AiTrainingRun"("runId");

-- CreateIndex
CREATE INDEX "AiTrainingRun_createdAt_idx" ON "AiTrainingRun"("createdAt");

-- CreateIndex
CREATE INDEX "AiTrainingRun_status_createdAt_idx" ON "AiTrainingRun"("status", "createdAt");
