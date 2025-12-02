export type PullRequest = {
  id: number;
  title: string;
  repo: string;
  status: "OPEN" | "CLOSED" | "MERGED";
  createdAt: string;
};
