import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./http";
import { toast } from "sonner";

export const fetchProfile = async () => {
  const response = await api.get("/users/users/profile");
  return response.data;
};

export const useFetchProfile = () =>
  useQuery({
    queryKey: ["setting"],
    queryFn: fetchProfile,
  });

// Update Profile (name, email, avatarUrl, githubUsername, theme)
export const updateProfile = async (data: {
  name?: string;
  email?: string;
  avatarUrl?: string;
  githubUsername?: string;
  theme?: string;
}) => {
  const response = await api.put("/users/users/profile", data);
  return response.data;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setting"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    },
  });
};

// Update API Settings (claudeApiKey, modelEndpoint)
export const updateApiSettings = async (data: {
  claudeApiKey?: string;
  modelEndpoint?: string;
}) => {
  const response = await api.put("/users/users/settings/api", data);
  return response.data;
};

export const useUpdateApiSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateApiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setting"] });
      toast.success("API settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update API settings"
      );
    },
  });
};

// Update AI Settings (riskThreshold, enableLlmReview, enableMlPrediction)
export const updateAiSettings = async (data: {
  riskThreshold?: number;
  enableLlmReview?: boolean;
  enableMlPrediction?: boolean;
}) => {
  const response = await api.put("/users/users/settings/ai", data);
  return response.data;
};

export const useUpdateAiSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setting"] });
      toast.success("AI settings updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update AI settings"
      );
    },
  });
};
