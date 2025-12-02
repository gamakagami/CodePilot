import { PullRequest } from "./pr.types";

export const getUserPullRequests = async (userId: number): Promise<PullRequest[]> => {
  return [
    {
      id: 101,
      title: "Fix API response type",
      repo: "codepilot-backend",
      status: "OPEN",
      createdAt: "2025-01-12T10:00:00Z",
    },
    {
      id: 102,
      title: "Improve dashboard UI",
      repo: "codepilot-frontend",
      status: "MERGED",
      createdAt: "2025-02-01T18:00:00Z",
    },
  ];
};
