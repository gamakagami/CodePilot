import { prisma } from "../../prisma";
import { DashboardMetrics } from "./dashboard.types";

export const getDashboardData = async (userId: string): Promise<DashboardMetrics> => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!profile) throw new Error("User profile not found");

  const profileId = profile.id;

  // Avg CI Latency
  const avgAnalysis = await prisma.pullRequest.aggregate({
    _avg: { analysisDuration: true },
    where: {
      repository: { userProfileId: profileId },
      analysisDuration: { not: null }
    }
  });

  // Active Repositories
  const activeRepositories = await prisma.repository.count({
    where: { userProfileId: profileId }
  });

  // Model Accuracy
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

  const modelAccuracy =
    totalEvaluated === 0 ? 0 : (correctPredictions / totalEvaluated) * 100;

  // ✅ Get repositories with lastAnalyzed
  const repositories = await prisma.repository.findMany({
    where: { userProfileId: profileId },
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      lastAnalyzed: true, // ✅ Added
      failureRate: true,  // ✅ Added
      _count: { select: { pullRequests: true } },
      pullRequests: {
        where: { status: "open" },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          riskScore: true,
        }
      }
    }
  });

  // ✅ Get recent pull requests with lastAnalyzed
  const recentPullRequests = await prisma.pullRequest.findMany({
    where: {
      repository: { userProfileId: profileId }
    },
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      author: true,
      status: true,
      createdAt: true,
      lastAnalyzed: true, // ✅ Added
      riskScore: true,
      predictedFailure: true,
      actualFailure: true,
      repository: { 
        select: { 
          name: true,
          lastAnalyzed: true, // ✅ Added
        } 
      }
    }
  });

  return {
    avgAnalysisDuration: avgAnalysis._avg.analysisDuration || 0,
    activeRepositories,
    modelAccuracy,
    repositories,
    recentPullRequests
  };
};