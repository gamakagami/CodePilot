// ============================================
// FILE: dashboard.types.ts
// ============================================
export type Repository = {
  id: number;
  name: string;
  fullName: string;
  openPRs: number;
  failureRate: number;
  lastAnalyzed: string;
  language: string | null;
  stars: number;
};

export type PullRequest = {
  id: number;
  title: string;
  repository: string;
  author: string;
  createdAt: string;
  status: 'analyzed' | 'pending' | 'merged';
  url: string;
};

export type DashboardSummary = {
  avgCILatency: number;
  modelAccuracy: number;
  activeRepositories: number;
  repositories: Repository[];
  recentPullRequests: PullRequest[];
};

// ============================================
// FILE: dashboard.service.ts
// ============================================
import axios from "axios";
import { DashboardSummary, Repository, PullRequest } from "./dashboard.types";

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:4002";

// Get user's GitHub token from user-service
const getUserGitHubToken = async (userId: string, authToken: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.githubToken;
  } catch (error) {
    console.error("Failed to get GitHub token:", error);
    return null;
  }
};

// Fetch user's repositories from GitHub
const fetchGitHubRepos = async (githubToken: string) => {
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json"
      },
      params: {
        sort: "updated",
        per_page: 100,
        affiliation: "owner,collaborator"
      }
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch GitHub repos:", error.response?.data || error.message);
    return [];
  }
};

// Fetch pull requests for a repository
const fetchRepoPullRequests = async (githubToken: string, owner: string, repo: string) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        },
        params: {
          state: "all",
          per_page: 10,
          sort: "updated",
          direction: "desc"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch PRs for ${owner}/${repo}`);
    return [];
  }
};

// Fetch CI/CD workflow runs for a repository
const fetchWorkflowRuns = async (githubToken: string, owner: string, repo: string) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        },
        params: {
          per_page: 20
        }
      }
    );
    return response.data.workflow_runs || [];
  } catch (error) {
    return [];
  }
};

// Calculate CI latency (average workflow duration)
const calculateCILatency = (workflowRuns: any[]): number => {
  if (workflowRuns.length === 0) return 24; // Default 24s

  const durations = workflowRuns
    .filter((run: any) => run.status === "completed")
    .map((run: any) => {
      const start = new Date(run.created_at).getTime();
      const end = new Date(run.updated_at).getTime();
      return (end - start) / 1000; // Convert to seconds
    });

  if (durations.length === 0) return 24;

  const avgSeconds = durations.reduce((a, b) => a + b, 0) / durations.length;
  return Math.round(avgSeconds);
};

// Calculate failure rate for a repository
const calculateFailureRate = (workflowRuns: any[]): number => {
  if (workflowRuns.length === 0) return 0;

  const completed = workflowRuns.filter((run: any) => run.status === "completed");
  if (completed.length === 0) return 0;

  const failed = completed.filter(
    (run: any) => run.conclusion === "failure" || run.conclusion === "cancelled"
  );

  return Math.round((failed.length / completed.length) * 100);
};

export const getDashboardSummary = async (
  userId: string,
  authToken: string
): Promise<DashboardSummary> => {
  // Get GitHub token from user profile
  const githubToken = await getUserGitHubToken(userId, authToken);

  if (!githubToken) {
    console.warn("No GitHub token found for user, returning mock data");
    return getMockDashboardData();
  }

  try {
    // Fetch all repositories
    const repos = await fetchGitHubRepos(githubToken);
    
    if (repos.length === 0) {
      return getMockDashboardData();
    }

    // Get detailed data for each repository
    const repositoriesPromises = repos.slice(0, 10).map(async (repo: any) => {
      const [owner, repoName] = repo.full_name.split("/");
      
      // Fetch PRs and workflow runs in parallel
      const [prs, workflowRuns] = await Promise.all([
        fetchRepoPullRequests(githubToken, owner, repoName),
        fetchWorkflowRuns(githubToken, owner, repoName)
      ]);

      const openPRs = prs.filter((pr: any) => pr.state === "open").length;
      const failureRate = calculateFailureRate(workflowRuns);
      
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        openPRs,
        failureRate,
        lastAnalyzed: getRelativeTime(new Date(repo.updated_at)),
        language: repo.language,
        stars: repo.stargazers_count
      };
    });

    const repositories = await Promise.all(repositoriesPromises);

    // Collect all PRs from all repos for the recent PRs section
    const allPRsPromises = repos.slice(0, 5).map(async (repo: any) => {
      const [owner, repoName] = repo.full_name.split("/");
      const prs = await fetchRepoPullRequests(githubToken, owner, repoName);
      
      return prs.slice(0, 4).map((pr: any) => ({
        id: pr.id,
        title: pr.title,
        repository: repo.name,
        author: pr.user.login,
        createdAt: getRelativeTime(new Date(pr.created_at)),
        status: pr.merged_at ? 'merged' : pr.state === 'open' ? 'analyzed' : 'pending',
        url: pr.html_url
      }));
    });

    const allPRsNested = await Promise.all(allPRsPromises);
    const recentPullRequests = allPRsNested
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Calculate overall CI latency from first repo with workflows
    let avgCILatency = 24;
    for (const repo of repos.slice(0, 5)) {
      const [owner, repoName] = repo.full_name.split("/");
      const workflowRuns = await fetchWorkflowRuns(githubToken, owner, repoName);
      if (workflowRuns.length > 0) {
        avgCILatency = calculateCILatency(workflowRuns);
        break;
      }
    }

    // Calculate model accuracy (mock for now, would be based on actual predictions)
    const modelAccuracy = 0.87;

    return {
      avgCILatency,
      modelAccuracy,
      activeRepositories: repositories.length,
      repositories,
      recentPullRequests: recentPullRequests as PullRequest[]
    };
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error.message);
    return getMockDashboardData();
  }
};

// Helper function to get relative time
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

// Mock data fallback
const getMockDashboardData = (): DashboardSummary => {
  return {
    avgCILatency: 24,
    modelAccuracy: 0.87,
    activeRepositories: 3,
    repositories: [
      {
        id: 1,
        name: "frontend-app",
        fullName: "user/frontend-app",
        openPRs: 5,
        failureRate: 18,
        lastAnalyzed: "2 hours ago",
        language: "TypeScript",
        stars: 12
      },
      {
        id: 2,
        name: "backend-api",
        fullName: "user/backend-api",
        openPRs: 3,
        failureRate: 12,
        lastAnalyzed: "1 day ago",
        language: "Python",
        stars: 8
      },
      {
        id: 3,
        name: "mobile-client",
        fullName: "user/mobile-client",
        openPRs: 8,
        failureRate: 25,
        lastAnalyzed: "30 minutes ago",
        language: "Kotlin",
        stars: 5
      }
    ],
    recentPullRequests: [
      {
        id: 1,
        title: "Fix authentication bug in login flow",
        repository: "frontend-app",
        author: "johndoe",
        createdAt: "2 hours ago",
        status: "analyzed",
        url: "https://github.com/user/frontend-app/pull/1"
      },
      {
        id: 2,
        title: "Add user profile endpoint",
        repository: "backend-api",
        author: "janedoe",
        createdAt: "5 hours ago",
        status: "analyzed",
        url: "https://github.com/user/backend-api/pull/2"
      },
      {
        id: 3,
        title: "Update mobile navigation component",
        repository: "mobile-client",
        author: "mikebrown",
        createdAt: "1 day ago",
        status: "pending",
        url: "https://github.com/user/mobile-client/pull/3"
      },
      {
        id: 4,
        title: "Refactor database queries for performance",
        repository: "backend-api",
        author: "sarahjones",
        createdAt: "1 day ago",
        status: "analyzed",
        url: "https://github.com/user/backend-api/pull/4"
      }
    ]
  };
};
