/*
  Warnings:

  - A unique constraint covering the columns `[title,repositoryId]` on the table `PullRequest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,userProfileId]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_title_repositoryId_key" ON "PullRequest"("title", "repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_name_userProfileId_key" ON "Repository"("name", "userProfileId");
