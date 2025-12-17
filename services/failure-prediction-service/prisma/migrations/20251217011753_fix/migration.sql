-- CreateTable
CREATE TABLE "Prediction" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "developer" TEXT NOT NULL,
    "moduleType" TEXT NOT NULL,
    "linesAdded" INTEGER NOT NULL,
    "linesDeleted" INTEGER NOT NULL,
    "filesChanged" INTEGER NOT NULL,
    "avgFunctionComplexity" DOUBLE PRECISION NOT NULL,
    "codeCoverageChange" DOUBLE PRECISION NOT NULL,
    "buildDuration" DOUBLE PRECISION NOT NULL,
    "containsTestChanges" BOOLEAN NOT NULL,
    "previousFailureRate" DOUBLE PRECISION NOT NULL,
    "predictedFailure" BOOLEAN NOT NULL,
    "failureProbability" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);
