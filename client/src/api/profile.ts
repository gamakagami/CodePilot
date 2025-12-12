import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./http";

export const fetchProfile = async () => {
  const response = await api.get("/users/users/profile");
  return response.data;
};

export const useFetchProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
