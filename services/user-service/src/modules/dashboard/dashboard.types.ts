export interface DashboardMetrics {
  avgAnalysisDuration: number;
  activeRepositories: number;
  modelAccuracy: number;
  repositories: {
    id: number;
    name: string;
    lastAnalyzed: Date | null;
    failureRate: number | null;
    _count: {
      pullRequests: number;
    };
    pullRequests: {
      id: number;
      number: number;
      title: string;
      status: string;
      riskScore: number | null;
    }[];
  }[];
  recentPullRequests: {
    id: number;
    number: number;
    title: string;
    author: string;
    status: string;
    createdAt: Date;
    lastAnalyzed: Date | null;
    riskScore: number | null;
    predictedFailure: boolean | null;
    actualFailure: boolean | null;
    repository: {
      name: string;
      lastAnalyzed: Date | null;
    };
  }[];
}