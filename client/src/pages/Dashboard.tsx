import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCw, GitPullRequest, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardQuery } from "@/api/dashboard";
import SyncModal from "./SyncModal";

const FALLBACK_DATA = {
  avgCILatency: 0,
  modelAccuracy: 0,
  activeRepositories: 0,
  repositories: [],
  recentPullRequests: [],
};

export default function Dashboard() {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const { data, isLoading, isError } = useDashboardQuery();
  const dashboard = data ?? FALLBACK_DATA;

  const stats = {
    avgLatency: `${dashboard.avgAnalysisDuration ?? 0}s`,
    accuracy: (dashboard.modelAccuracy ?? 0).toFixed(2),
    activeRepos: String(dashboard.activeRepositories ?? 0),
  };

  const repositories = dashboard.repositories ?? [];
  const recentPRs = dashboard.recentPullRequests ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, Developer 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your repositories.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg CI Latency
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgLatency}</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Model Accuracy
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accuracy}</div>
              <p className="text-xs text-muted-foreground">F1 score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Repositories
              </CardTitle>
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRepos}</div>
              <p className="text-xs text-muted-foreground">Connected</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Repository Overview</CardTitle>
                <CardDescription>
                  Monitor your connected repositories
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSyncModalOpen(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync from GitHub
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-sm text-muted-foreground">
                Loading repositories...
              </p>
            )}
            {isError && (
              <p className="text-sm text-destructive">
                Failed to load repositories. Showing fallback data.
              </p>
            )}
            <div className="space-y-4">
              {repositories.map((repo) => (
                <div
                  key={repo.id ?? repo.name}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">
                      {repo.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {repo.language ? `${repo.language} • ` : ""}
                      {repo.stars ? `${repo.stars}⭐ • ` : ""}
                      Last analyzed {repo.lastAnalyzed}
                    </p>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        {repo.openPRs}
                      </p>
                      <p className="text-muted-foreground">Open PRs</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        {(repo.failureRate ?? 0).toFixed(0)}%
                      </p>
                      <p className="text-muted-foreground">Failure rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Pull Requests</CardTitle>
            <CardDescription>
              Latest activity across your repositories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-sm text-muted-foreground">
                Loading pull requests...
              </p>
            )}
            {isError && (
              <p className="text-sm text-destructive">
                Failed to load PRs. Showing fallback data.
              </p>
            )}
            {!isLoading && (
              <div className="space-y-3">
                {recentPRs.map((pr) => (
                  <Link
                    key={pr.id}
                    to={pr.url || `/pr/${pr.id}`}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start space-x-4 flex-1">
                      <GitPullRequest className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {pr.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pr.repository} • {pr.author} • {pr.createdAt}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        pr.status === "analyzed" ? "default" : "secondary"
                      }
                    >
                      {pr.status === "analyzed" ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {pr.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SyncModal
        open={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </DashboardLayout>
  );
}
