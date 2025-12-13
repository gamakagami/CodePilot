import { prisma } from "../../prisma";

export const getPullRequestData = async (prId: number, userId: string) => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const pr = await prisma.pullRequest.findUnique({
    where: { id: prId },
    include: {
      repository: true,
      changedFiles: true,
      reviewComments: true,
      ratingHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          rating: true,
          createdAt: true,
        },
      },
    },
  });

  if (!pr || pr.repository.userProfileId !== profile?.id) {
    throw new Error("PR not found or access denied");
  }

  // Calculate feature importance from changed files
  const filesChanged = pr.changedFiles.length;
  const totalComplexity = pr.changedFiles.reduce((sum, f) => sum + (f.complexity || 0), 0);
  const avgComplexity = filesChanged > 0 ? totalComplexity / filesChanged : 0;
  const linesAdded = pr.changedFiles.reduce((sum, f) => sum + f.additions, 0);

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.author,
    status: pr.status,
    createdAt: pr.createdAt,
    repository: pr.repository.name,
    riskScore: pr.riskScore ?? 0, 
    predictedFailure: pr.predictedFailure,
    actualFailure: pr.actualFailure, 
    analysisSummary: pr.analysisSummary,
    analysisDuration: pr.analysisDuration,
    rating: pr.rating,
    ratingHistory: pr.ratingHistory,
    changedFiles: pr.changedFiles.map(f => ({
      filename: f.filename,
      additions: f.additions,
      deletions: f.deletions,
      diff: f.diff ?? '',
    })),
    reviewComments: pr.reviewComments,
    featureImportance: { // 
      filesChanged,
      avgComplexity,
      linesAdded,
      buildDuration: pr.analysisDuration ?? 0,
    },
  };
};


export const ratePullRequest = async (prId: number, rating: number) => {
  // Add new rating to history
  await prisma.ratingHistory.create({
    data: {
      pullRequestId: prId,
      rating,
    },
  });

  // Calculate new average
  const allRatings = await prisma.ratingHistory.findMany({
    where: { pullRequestId: prId },
    select: { rating: true },
  });

  const avgRating =
    allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

  // Update PR with new average
  return prisma.pullRequest.update({
    where: { id: prId },
    data: { rating: avgRating },
  });
};
