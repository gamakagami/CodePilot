import { useQuery } from "@tanstack/react-query";
import api from "./http";

export type AnalyticsResponse = {
  totalPRsAnalyzed: number;
  averageModelAccuracy: number;
  averageResponseTime: number;
  activeRepositories: number;
  modelPerformanceOverTime: { date: string; accuracy: number }[];
  ciLatencyComparison: { traditional: number; codePilot: number };
  llmFeedbackQuality: { month: string; rating: number }[];
  repositoryComparison: {
    repository: string;
    prsAnalyzed: number;
    avgFailureRate: number;
    avgLatency: number;
  }[];
};

export const fetchAnalytics = async (): Promise<AnalyticsResponse> => {
  const res = await api.get("/analytics/");
  return res.data;
};

export const useAnalyticsQuery = () =>
  useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics
  });

