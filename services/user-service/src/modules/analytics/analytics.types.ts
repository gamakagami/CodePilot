export type ModelPerformanceDataPoint = {
  date: string;
  accuracy: number;
};

export type CILatencyComparison = {
  traditional: number;
  codePilot: number;
};

export type LLMFeedbackDataPoint = {
  month: string;
  rating: number;
};

export type RepositoryComparison = {
  repository: string;
  prsAnalyzed: number;
  avgFailureRate: number;
  avgLatency: number;
};

export type AnalyticsSummary = {
  totalPRsAnalyzed: number;
  averageModelAccuracy: number;
  averageResponseTime: number;
  activeRepositories: number;
  modelPerformanceOverTime: ModelPerformanceDataPoint[];
  ciLatencyComparison: CILatencyComparison;
  llmFeedbackQuality: LLMFeedbackDataPoint[];
  repositoryComparison: RepositoryComparison[];
};