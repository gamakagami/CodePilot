-- CreateTable
CREATE TABLE "Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL,
    "developer" TEXT NOT NULL,
    "moduleType" TEXT NOT NULL,
    "linesAdded" INTEGER NOT NULL,
    "linesDeleted" INTEGER NOT NULL,
    "filesChanged" INTEGER NOT NULL,
    "avgFunctionComplexity" REAL NOT NULL,
    "codeCoverageChange" REAL NOT NULL,
    "buildDuration" REAL NOT NULL,
    "containsTestChanges" BOOLEAN NOT NULL,
    "previousFailureRate" REAL NOT NULL,
    "predictedFailure" BOOLEAN NOT NULL,
    "failureProbability" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
