import { useQuery } from "@tanstack/react-query";
import api from "./http";

export const fetchDashboard = async () => {
  const response = await api.get("/dashboard/");
  return response.data;
};

export const useDashboardQuery = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard
  });

