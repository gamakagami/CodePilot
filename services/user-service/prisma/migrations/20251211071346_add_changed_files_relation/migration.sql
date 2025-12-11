-- CreateTable
CREATE TABLE "ChangedFile" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "additions" INTEGER NOT NULL,
    "deletions" INTEGER NOT NULL,
    "complexity" DOUBLE PRECISION,
    "diff" TEXT,
    "pullRequestId" INTEGER NOT NULL,

    CONSTRAINT "ChangedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" SERIAL NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "pullRequestId" INTEGER NOT NULL,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChangedFile" ADD CONSTRAINT "ChangedFile_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
