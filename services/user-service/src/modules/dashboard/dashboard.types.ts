export type Repository = {
  id: number;
  name: string;
  fullName: string;
  openPRs: number;
  failureRate: number;
  lastAnalyzed: string;
  language: string | null;
  stars: number;
};

export type PullRequest = {
  id: number;
  title: string;
  repository: string;
  author: string;
  createdAt: string;
  status: 'analyzed' | 'pending' | 'merged';
  url: string;
};

export type DashboardSummary = {
  avgCILatency: number;
  modelAccuracy: number;
  activeRepositories: number;
  repositories: Repository[];
  recentPullRequests: PullRequest[];
};