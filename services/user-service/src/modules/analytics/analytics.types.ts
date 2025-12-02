export type RepoAnalytics = {
  repoName: string;
  stars: number;
  forks: number;
  issues: number;
  commitsLast30Days: number;
  topContributors: string[];
  languages: {
    language: string;
    percentage: number;
  }[];
};
