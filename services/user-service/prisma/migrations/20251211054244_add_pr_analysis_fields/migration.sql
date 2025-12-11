-- AlterTable
ALTER TABLE "PullRequest" ADD COLUMN     "analysisSummary" TEXT,
ADD COLUMN     "lastAnalyzed" TIMESTAMP(3),
ADD COLUMN     "llmReview" TEXT,
ADD COLUMN     "riskScore" DOUBLE PRECISION;
