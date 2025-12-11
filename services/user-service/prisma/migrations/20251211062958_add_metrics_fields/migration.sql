-- AlterTable
ALTER TABLE "PullRequest" ADD COLUMN     "actualFailure" BOOLEAN,
ADD COLUMN     "analysisDuration" DOUBLE PRECISION,
ADD COLUMN     "predictedFailure" BOOLEAN;
