import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const res = await api.get("/users/analytics/");
  return res.data;
};

export const useAnalyticsQuery = () =>
  useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

export const ratePullRequest = async (prId: string, rating: number) => {
  const res = await api.post(`/users/pullRequest/${prId}/rate`, {
    rating,
  });
  return res.data;
};

export const useRatePullRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prId, rating }: { prId: string; rating: number }) =>
      ratePullRequest(prId, rating),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pullRequest", variables.prId],
      });
    },
  });
};

export const submitPullRequest = async (prId: string) => {
  const res = await api.post(`/users/users/pull-requests/${prId}/submit`);
  return res.data;
};

export const useSubmitPullRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prId }: { prId: string }) => submitPullRequest(prId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pullRequest", variables.prId],
      });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const submitFeedback = async (prId: string, actualFailure: boolean) => {
  const res = await api.post(`/users/users/pull-requests/${prId}/feedback`, {
    actualFailure,
  });
  return res.data;
};

export const useSubmitFeedbackMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      prId,
      actualFailure,
    }: {
      prId: string;
      actualFailure: boolean;
    }) => submitFeedback(prId, actualFailure),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pullRequest", variables.prId],
      });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};
export const fetchPullRequest = async (prId: string) => {
  const res = await api.get(`/users/pullRequest/${prId}`);
  return res.data;
};

export const usePullRequestQuery = (prId: string) =>
  useQuery({
    queryKey: ["pullRequest", prId],
    queryFn: () => fetchPullRequest(prId),
  });
