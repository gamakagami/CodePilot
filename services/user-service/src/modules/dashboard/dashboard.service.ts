import { DashboardSummary } from "./dashboard.types";

export const getDashboardSummary = async (userId: number): Promise<DashboardSummary> => {
  return {
    totalRepos: 12,
    totalStars: 87,
    activePRs: 3,
    commitsThisWeek: 24,
    languagesUsed: ["TypeScript", "Python", "Go"],
  };
};
