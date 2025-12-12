import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./http";

export const fetchDashboard = async () => {
  const response = await api.get("/users/dashboard");
  return response.data;
};

export const fetchRepository = async (repoName: string) => {
  const response = await api.post(`/users/users/repositories/sync/${repoName}`);
  return response.data;
};

export const reSyncRepositories = async () => {
  const response = await api.post("/users/users/repositories/sync");
  return response.data;
};

export const useDashboardQuery = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

export const useSyncRepositoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useReSyncMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reSyncRepositories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};
