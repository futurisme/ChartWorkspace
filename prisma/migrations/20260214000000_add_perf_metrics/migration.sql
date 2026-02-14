-- CreateTable
CREATE TABLE "PerfMetric" (
    "id" SERIAL NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricId" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT,
    "navigationType" TEXT,
    "route" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "pageUrl" TEXT,
    "metadata" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerfMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerfMetric_recordedAt_idx" ON "PerfMetric"("recordedAt");

-- CreateIndex
CREATE INDEX "PerfMetric_routeType_metricName_recordedAt_idx" ON "PerfMetric"("routeType", "metricName", "recordedAt");
