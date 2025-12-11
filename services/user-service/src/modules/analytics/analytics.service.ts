import { prisma } from "../../prisma";
import { AnalyticsPayload } from "./analytics.types";

export const getAnalyticsData = async (userId: string): Promise<AnalyticsPayload> => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!profile) throw new Error("User profile not found");

  const profileId = profile.id;

  // ✅ Total PRs analyzed
  const totalPRsAnalyzed = await prisma.pullRequest.count({
    where: { repository: { userProfileId: profileId } }
  });

  // ✅ Average response time
  const avgLatency = await prisma.pullRequest.aggregate({
    _avg: { analysisDuration: true },
    where: {
      repository: { userProfileId: profileId },
      analysisDuration: { not: null }
    }
  });

  // ✅ Success Rate
  const correctPredictions = await prisma.pullRequest.count({
    where: {
      repository: { userProfileId: profileId },
      predictedFailure: { not: null },
      actualFailure: { not: null },
      predictedFailure: { equals: prisma.pullRequest.fields.actualFailure }
    }
  });

  const totalEvaluated = await prisma.pullRequest.count({
    where: {
      repository: { userProfileId: profileId },
      predictedFailure: { not: null },
      actualFailure: { not: null }
    }
  });

  const successRate =
    totalEvaluated === 0
      ? 0
      : parseFloat(((correctPredictions / totalEvaluated) * 100).toFixed(2));

  // ✅ Active repositories
  const activeRepositories = await prisma.repository.count({
    where: { userProfileId: profileId }
  });

  // ✅ Repository comparison
  const repoComparison = await prisma.repository.findMany({
    where: { userProfileId: profileId },
    include: { pullRequests: true }
  });

  const repositoryComparison = repoComparison.map(repo => {
    const prs = repo.pullRequests;

    const failureRate =
      prs.length === 0
        ? 0
        : prs.filter(pr => pr.predictedFailure === true).length / prs.length;

    const avgLatency =
      prs.length === 0
        ? 0
        : prs.reduce((sum, pr) => sum + (pr.analysisDuration || 0), 0) / prs.length;

    return {
      name: repo.name,
      prsAnalyzed: prs.length,
      avgFailureRate: parseFloat((failureRate * 100).toFixed(2)),
      avgLatency: parseFloat(avgLatency.toFixed(2))
    };
  });

  // ✅ REAL LLM Feedback Quality (average rating)
  const ratingData = await prisma.pullRequest.aggregate({
    _avg: { rating: true },
    where: {
      repository: { userProfileId: profileId },
      rating: { not: null }
    }
  });

  const llmFeedbackQuality = parseFloat((ratingData._avg.rating || 0).toFixed(2));

  return {
    totalPRsAnalyzed,
    successRate,
    averageResponseTime: parseFloat((avgLatency._avg.analysisDuration || 0).toFixed(2)),
    activeRepositories,
    llmFeedbackQuality,
    repositoryComparison
  };
};
