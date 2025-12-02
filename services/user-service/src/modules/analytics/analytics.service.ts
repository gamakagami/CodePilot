import { RepoAnalytics } from "./analytics.types";

export const getRepoAnalytics = async (
  userId: number,
  repoName: string
): Promise<RepoAnalytics> => {
  return {
    repoName,
    stars: 42,
    forks: 9,
    issues: 5,
    commitsLast30Days: 58,
    topContributors: ["Gabriel", "Alice", "John"],
    languages: [
      { language: "TypeScript", percentage: 72 },
      { language: "HTML", percentage: 15 },
      { language: "CSS", percentage: 13 },
    ],
  };
};
