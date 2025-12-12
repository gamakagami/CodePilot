export interface AnalyticsPayload {
  totalPRsAnalyzed: number;
  successRate: number;
  averageResponseTime: number;
  activeRepositories: number;
  llmFeedbackQuality: number;
  llmFeedbackHistory: { 
    rating: number;
    createdAt: Date;
  }[];
  repositoryComparison: {
    name: string;
    prsAnalyzed: number;
    avgFailureRate: number;
    avgLatency: number;
  }[];
}