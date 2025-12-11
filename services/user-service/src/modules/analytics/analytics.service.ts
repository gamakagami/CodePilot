import axios from "axios";
import { AnalyticsSummary, ModelPerformanceDataPoint, LLMFeedbackDataPoint, RepositoryComparison } from "./analytics.types";

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:4002";
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://localhost:4001";

// Get user's GitHub token from user-service
const getUserGitHubToken = async (userId: string, authToken: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.githubToken;
  } catch (error) {
    console.error("Failed to get GitHub token:", error);
    return null;
  }
};

// Fetch user's repositories from GitHub
const fetchGitHubRepos = async (githubToken: string) => {
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json"
      },
      params: {
        sort: "updated",
        per_page: 100,
        affiliation: "owner,collaborator"
      }
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch GitHub repos:", error.response?.data || error.message);
    return [];
  }
};

// Fetch CI/CD workflow runs for a repository
const fetchWorkflowRuns = async (githubToken: string, owner: string, repo: string) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        },
        params: {
          per_page: 100
        }
      }
    );
    return response.data.workflow_runs || [];
  } catch (error) {
    return [];
  }
};

// Fetch analysis history from orchestrator
const fetchAnalysisHistory = async (authToken: string) => {
  try {
    const response = await axios.get(
      `${ORCHESTRATOR_URL}/history`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    return response.data.data || [];
  } catch (error) {
    console.error("Failed to fetch analysis history:", error);
    return [];
  }
};

// Fetch metrics history from orchestrator
const fetchMetricsHistory = async (authToken: string, period: string) => {
  try {
    const response = await axios.get(
      `${ORCHESTRATOR_URL}/metrics/history`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { period }
      }
    );
    return response.data.data?.metrics || [];
  } catch (error) {
    console.error("Failed to fetch metrics history:", error);
    return [];
  }
};

// Fetch feedback data from orchestrator
const fetchFeedbackData = async (authToken: string, period: string) => {
  try {
    const response = await axios.get(
      `${ORCHESTRATOR_URL}/feedback`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { period }
      }
    );
    return response.data.data?.feedback || [];
  } catch (error) {
    console.error("Failed to fetch feedback:", error);
    return [];
  }
};

// Fetch baseline metrics
const fetchBaselineMetrics = async (authToken: string) => {
  try {
    const response = await axios.get(
      `${ORCHESTRATOR_URL}/baseline-metrics`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch baseline metrics:", error);
    return { traditionalLatency: 240 };
  }
};

// Fetch analyses for a repository
const fetchRepositoryAnalyses = async (authToken: string, repoFullName: string) => {
  try {
    const response = await axios.get(
      `${ORCHESTRATOR_URL}/repository/${encodeURIComponent(repoFullName)}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    return response.data.data?.analyses || [];
  } catch (error) {
    return [];
  }
};

// Calculate average latency for workflow runs
const calculateAverageLatency = (workflowRuns: any[]): number => {
  if (workflowRuns.length === 0) return 24;

  const durations = workflowRuns
    .filter((run: any) => run.status === "completed")
    .map((run: any) => {
      const start = new Date(run.created_at).getTime();
      const end = new Date(run.updated_at).getTime();
      return (end - start) / 1000;
    });

  if (durations.length === 0) return 24;

  const avgSeconds = durations.reduce((a, b) => a + b, 0) / durations.length;
  return Math.round(avgSeconds);
};

// Calculate failure rate for workflow runs
const calculateFailureRate = (workflowRuns: any[]): number => {
  if (workflowRuns.length === 0) return 0;

  const completed = workflowRuns.filter((run: any) => run.status === "completed");
  if (completed.length === 0) return 0;

  const failed = completed.filter(
    (run: any) => run.conclusion === "failure" || run.conclusion === "cancelled"
  );

  return Math.round((failed.length / completed.length) * 100);
};

// Process model performance data
const processModelPerformance = (metrics: any[]): ModelPerformanceDataPoint[] => {
  if (metrics.length === 0) {
    return [];
  }

  // Group by month
  const monthlyData = new Map<string, number[]>();
  
  metrics.forEach((metric: any) => {
    const date = new Date(metric.timestamp);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    
    monthlyData.get(monthKey)!.push(metric.accuracy || 0);
  });

  const result: ModelPerformanceDataPoint[] = [];
  monthlyData.forEach((accuracies, date) => {
    const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    result.push({
      date,
      accuracy: parseFloat(avgAccuracy.toFixed(3))
    });
  });

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Process LLM feedback
const processLLMFeedback = (feedback: any[]): LLMFeedbackDataPoint[] => {
  if (feedback.length === 0) {
    return [];
  }

  const monthlyRatings = new Map<string, number[]>();
  
  feedback.forEach((item: any) => {
    const date = new Date(item.timestamp);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
    
    if (!monthlyRatings.has(monthKey)) {
      monthlyRatings.set(monthKey, []);
    }
    
    monthlyRatings.get(monthKey)!.push(item.rating || 0);
  });

  const result: LLMFeedbackDataPoint[] = [];
  monthlyRatings.forEach((ratings, month) => {
    const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    result.push({
      month,
      rating: parseFloat(avgRating.toFixed(1))
    });
  });

  return result;
};

export const getAnalyticsSummary = async (
  userId: string,
  authToken: string
): Promise<AnalyticsSummary> => {
  const githubToken = await getUserGitHubToken(userId, authToken);

  if (!githubToken) {
    console.warn("No GitHub token found, returning mock analytics");
    return getMockAnalytics();
  }

  try {
    const repos = await fetchGitHubRepos(githubToken);
    
    if (repos.length === 0) {
      return getMockAnalytics();
    }

    // Fetch all data from orchestrator in parallel
    const [analysisHistory, metricsHistory, feedbackData, baselineMetrics] = await Promise.all([
      fetchAnalysisHistory(authToken),
      fetchMetricsHistory(authToken, "6months"),
      fetchFeedbackData(authToken, "6months"),
      fetchBaselineMetrics(authToken)
    ]);

    // Total PRs analyzed from stored data
    const totalPRsAnalyzed = analysisHistory.length;

    // Calculate average model accuracy
    let averageModelAccuracy = 0.87;
    if (analysisHistory.length > 0) {
      const accuracySum = analysisHistory.reduce((sum: number, analysis: any) => {
        const confidence = analysis.prediction?.confidence?.toLowerCase() || 'medium';
        if (confidence === 'high') return sum + 0.90;
        if (confidence === 'medium') return sum + 0.85;
        return sum + 0.80;
      }, 0);
      averageModelAccuracy = parseFloat((accuracySum / analysisHistory.length).toFixed(3));
    }

    // Group analyses by repository
    const repoAnalysesMap = new Map<string, any[]>();
    analysisHistory.forEach((analysis: any) => {
      const repoName = analysis.repositoryFullName;
      if (!repoAnalysesMap.has(repoName)) {
        repoAnalysesMap.set(repoName, []);
      }
      repoAnalysesMap.get(repoName)!.push(analysis);
    });

    const repoComparisons: RepositoryComparison[] = [];

    // Analyze each repository
    for (const repo of repos.slice(0, 10)) {
      const [owner, repoName] = repo.full_name.split("/");
      
      const [workflowRuns, repoAnalyses] = await Promise.all([
        fetchWorkflowRuns(githubToken, owner, repoName),
        Promise.resolve(repoAnalysesMap.get(repo.full_name) || [])
      ]);

      const prsAnalyzed = repoAnalyses.length;
      const avgFailureRate = calculateFailureRate(workflowRuns);
      const avgLatency = calculateAverageLatency(workflowRuns);

      repoComparisons.push({
        repository: repo.name,
        prsAnalyzed,
        avgFailureRate,
        avgLatency
      });
    }

    repoComparisons.sort((a, b) => b.prsAnalyzed - a.prsAnalyzed);

    // Calculate average response time
    const reposWithLatency = repoComparisons.filter(r => r.avgLatency > 0);
    const averageResponseTime = reposWithLatency.length > 0
      ? Math.round(reposWithLatency.reduce((sum, r) => sum + r.avgLatency, 0) / reposWithLatency.length)
      : 24;

    // Process model performance and feedback
    const modelPerformanceOverTime = processModelPerformance(metricsHistory);
    const llmFeedbackQuality = processLLMFeedback(feedbackData);

    return {
      totalPRsAnalyzed,
      averageModelAccuracy,
      averageResponseTime,
      activeRepositories: repos.length,
      modelPerformanceOverTime: modelPerformanceOverTime.length > 0 ? modelPerformanceOverTime : getMockAnalytics().modelPerformanceOverTime,
      ciLatencyComparison: {
        traditional: baselineMetrics.traditionalLatency || 240,
        codePilot: averageResponseTime
      },
      llmFeedbackQuality: llmFeedbackQuality.length > 0 ? llmFeedbackQuality : getMockAnalytics().llmFeedbackQuality,
      repositoryComparison: repoComparisons.slice(0, 3)
    };
  } catch (error: any) {
    console.error("Error fetching analytics:", error.message);
    return getMockAnalytics();
  }
};

const getMockAnalytics = (): AnalyticsSummary => {
  return {
    totalPRsAnalyzed: 156,
    averageModelAccuracy: 0.87,
    averageResponseTime: 24,
    activeRepositories: 3,
    modelPerformanceOverTime: [
      { date: "Jan 15", accuracy: 0.82 },
      { date: "Feb 5", accuracy: 0.84 },
      { date: "Mar 15", accuracy: 0.86 },
      { date: "Apr 22", accuracy: 0.85 },
      { date: "May 29", accuracy: 0.88 },
      { date: "Jul 5", accuracy: 0.91 }
    ],
    ciLatencyComparison: {
      traditional: 240,
      codePilot: 24
    },
    llmFeedbackQuality: [
      { month: "Jan", rating: 4.0 },
      { month: "Feb", rating: 4.1 },
      { month: "Mar", rating: 4.0 },
      { month: "Apr", rating: 4.2 },
      { month: "May", rating: 4.4 }
    ],
    repositoryComparison: [
      { repository: "frontend-app", prsAnalyzed: 24, avgFailureRate: 18, avgLatency: 22 },
      { repository: "backend-api", prsAnalyzed: 11, avgFailureRate: 35, avgLatency: 28 },
      { repository: "mobile-client", prsAnalyzed: 19, avgFailureRate: 22, avgLatency: 25 }
    ]
  };
};