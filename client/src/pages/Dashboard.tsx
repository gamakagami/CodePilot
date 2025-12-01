import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCw, GitPullRequest, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const repositories = [
    { 
      name: "frontend-app", 
      openPRs: 5, 
      avgFailureRate: 0.18, 
      lastAnalyzed: "2 hours ago" 
    },
    { 
      name: "backend-api", 
      openPRs: 3, 
      avgFailureRate: 0.12, 
      lastAnalyzed: "1 day ago" 
    },
    { 
      name: "mobile-client", 
      openPRs: 8, 
      avgFailureRate: 0.25, 
      lastAnalyzed: "30 minutes ago" 
    },
  ];

  const recentPRs = [
    {
      id: 1,
      title: "Fix authentication bug in login flow",
      repo: "frontend-app",
      author: "johndoe",
      date: "2 hours ago",
      status: "analyzed"
    },
    {
      id: 2,
      title: "Add user profile endpoint",
      repo: "backend-api",
      author: "janedoe",
      date: "5 hours ago",
      status: "analyzed"
    },
    {
      id: 3,
      title: "Update mobile navigation component",
      repo: "mobile-client",
      author: "mikebrown",
      date: "1 day ago",
      status: "pending"
    },
    {
      id: 4,
      title: "Refactor database queries for performance",
      repo: "backend-api",
      author: "sarahjones",
      date: "1 day ago",
      status: "analyzed"
    },
  ];

  const stats = {
    avgLatency: "24s",
    accuracy: "0.87",
    activeRepos: "3"
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, Developer 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your repositories.
          </p>
        </div>

        {/* System Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CI Latency</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgLatency}</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accuracy}</div>
              <p className="text-xs text-muted-foreground">F1 score</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Repositories</CardTitle>
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRepos}</div>
              <p className="text-xs text-muted-foreground">Connected</p>
            </CardContent>
          </Card>
        </div>

        {/* Repository Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Repository Overview</CardTitle>
                <CardDescription>Monitor your connected repositories</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync from GitHub
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {repositories.map((repo) => (
                <div
                  key={repo.name}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{repo.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Last analyzed {repo.lastAnalyzed}
                    </p>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium text-foreground">{repo.openPRs}</p>
                      <p className="text-muted-foreground">Open PRs</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        {(repo.avgFailureRate * 100).toFixed(0)}%
                      </p>
                      <p className="text-muted-foreground">Failure rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Pull Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Pull Requests</CardTitle>
            <CardDescription>Latest activity across your repositories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPRs.map((pr) => (
                <Link
                  key={pr.id}
                  to={`/pr/${pr.id}`}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <GitPullRequest className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {pr.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pr.repo} • {pr.author} • {pr.date}
                      </p>
                    </div>
                  </div>
                  <Badge variant={pr.status === "analyzed" ? "default" : "secondary"}>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
