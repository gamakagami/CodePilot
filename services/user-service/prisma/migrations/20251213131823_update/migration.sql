-- DropForeignKey
ALTER TABLE "ChangedFile" DROP CONSTRAINT "ChangedFile_pullRequestId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewComment" DROP CONSTRAINT "ReviewComment_pullRequestId_fkey";

-- AlterTable
ALTER TABLE "UserProfile" ALTER COLUMN "enableLlmReview" SET DEFAULT true,
ALTER COLUMN "enableMlPrediction" SET DEFAULT true;

-- CreateIndex
CREATE INDEX "ChangedFile_pullRequestId_idx" ON "ChangedFile"("pullRequestId");

-- CreateIndex
CREATE INDEX "PullRequest_repositoryId_idx" ON "PullRequest"("repositoryId");

-- CreateIndex
CREATE INDEX "ReviewComment_pullRequestId_idx" ON "ReviewComment"("pullRequestId");

-- AddForeignKey
ALTER TABLE "ChangedFile" ADD CONSTRAINT "ChangedFile_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
