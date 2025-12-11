export interface AnalyticsPayload {
  totalPRsAnalyzed: number;
  successRate: number;
  averageResponseTime: number;
  activeRepositories: number;
  llmFeedbackQuality: number; // ✅ NEW
  repositoryComparison: {
    name: string;
    prsAnalyzed: number;
    avgFailureRate: number;
    avgLatency: number;
  }[];
}
