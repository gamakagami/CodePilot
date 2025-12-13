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

  if (!pr || pr.repository.userProfileId !== profile.id) {
    throw new Error("PR not found or access denied");
  }

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.author,
    status: pr.status,
    createdAt: pr.createdAt,
    riskScore: pr.riskScore,
    predictedFailure: pr.predictedFailure,
    actualFailure: pr.actualFailure,
    analysisSummary: pr.analysisSummary,
    analysisDuration: pr.analysisDuration,
    rating: pr.rating, // Overall average
    ratingHistory: pr.ratingHistory, // Array for chart
    changedFiles: pr.changedFiles,
    reviewComments: pr.reviewComments,
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
