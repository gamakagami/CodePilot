/*
  Warnings:

  - A unique constraint covering the columns `[number,repositoryId]` on the table `PullRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `PullRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PullRequest_title_repositoryId_key";

-- AlterTable
ALTER TABLE "PullRequest" ADD COLUMN     "number" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_number_repositoryId_key" ON "PullRequest"("number", "repositoryId");
