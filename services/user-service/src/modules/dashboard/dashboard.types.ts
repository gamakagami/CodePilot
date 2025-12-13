export interface DashboardMetrics {
  avgAnalysisDuration: number;
  activeRepositories: number;
  modelAccuracy: number;
  repositories: {
    id: number;
    name: string;
    lastAnalyzed: Date | null; // ✅ Added
    failureRate: number | null; // ✅ Added
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
    lastAnalyzed: Date | null; // ✅ Added
    riskScore: number | null;
    predictedFailure: boolean | null;
    actualFailure: boolean | null;
    repository: {
      name: string;
      lastAnalyzed: Date | null; // ✅ Added
    };
  }[];
}