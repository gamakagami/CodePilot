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
  const linesDeleted = pr.changedFiles.reduce((sum, f) => sum + f.deletions, 0);

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.author,
    status: pr.status,
    createdAt: pr.createdAt,
    
    // Repository info
    repository: pr.repository.name,
    repositoryLastAnalyzed: pr.repository.lastAnalyzed,
    repositoryFailureRate: pr.repository.failureRate,
    
    // PR analysis
    riskScore: pr.riskScore ?? 0, 
    predictedFailure: pr.predictedFailure,
    actualFailure: pr.actualFailure,
    analysisSummary: pr.analysisSummary,
    analysisDuration: pr.analysisDuration,
    lastAnalyzed: pr.lastAnalyzed,
    
    // Ratings
    rating: pr.rating,
    ratingHistory: pr.ratingHistory,
    
    // Files
    changedFiles: pr.changedFiles.map(f => ({
      filename: f.filename,
      additions: f.additions,
      deletions: f.deletions,
      diff: f.diff ?? '',
      complexity: f.complexity ?? 0,
    })),
    
    // Comments
    reviewComments: pr.reviewComments,
    
    // Feature importance
    featureImportance: {
      filesChanged,
      avgComplexity,
      linesAdded,
      linesDeleted,
      buildDuration: pr.analysisDuration ?? 0,
    },
  };
};

export const ratePullRequest = async (prId: number, rating: number) => {
  return await prisma.$transaction(async (tx) => {
    // Add new rating to history
    await tx.ratingHistory.create({
      data: {
        pullRequestId: prId,
        rating,
      },
    });

    // Calculate new average
    const allRatings = await tx.ratingHistory.findMany({
      where: { pullRequestId: prId },
      select: { rating: true },
    });

    const avgRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    // Update PR with new average
    return tx.pullRequest.update({
      where: { id: prId },
      data: { rating: avgRating },
    });
  });
};