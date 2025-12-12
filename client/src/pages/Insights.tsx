import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Clock, Target, GitPullRequest } from "lucide-react";
import { useAnalyticsQuery } from "@/api/analytics";

const FALLBACK = {
  totalPRsAnalyzed: 0,
  averageModelAccuracy: 0.87,
  averageResponseTime: 24,
  activeRepositories: 3,
  modelPerformanceOverTime: [],
  ciLatencyComparison: {
    traditional: 240,
    codePilot: 24,
  },
  llmFeedbackQuality: [
    { month: "Jan", rating: 4 },
    { month: "Feb", rating: 4.1 },
    { month: "Mar", rating: 4 },
    { month: "Apr", rating: 4.2 },
    { month: "May", rating: 4.4 },
  ],
  repositoryComparison: [
    {
      repository: "frontend-app",
      prsAnalyzed: 24,
      avgFailureRate: 18,
      avgLatency: 22,
    },
    {
      repository: "backend-api",
      prsAnalyzed: 11,
      avgFailureRate: 35,
      avgLatency: 28,
    },
    {
      repository: "mobile-client",
      prsAnalyzed: 19,
      avgFailureRate: 22,
      avgLatency: 25,
    },
  ],
};

export default function Insights() {
  const { data, isLoading, isError } = useAnalyticsQuery();
  const analytics = FALLBACK;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Insights & Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Track performance metrics and model accuracy across your
            repositories
          </p>
        </div>

        {/* Overview Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total PRs Analyzed",
              value: analytics.totalPRsAnalyzed,
              icon: GitPullRequest,
            },
            {
              label: "Average Model Accuracy",
              value: analytics.averageModelAccuracy,
              icon: Target,
            },
            {
              label: "Average Response Time",
              value: `${analytics.averageResponseTime}s`,
              icon: Clock,
            },
            {
              label: "Active Repositories",
              value: analytics.activeRepositories,
              icon: TrendingUp,
            },
          ].map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.label}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Model Performance Chart */}

          {/* CI Latency Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>CI Latency Comparison</CardTitle>
              <CardDescription>
                Traditional CI vs CodePilot feedback time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: "Traditional CI",
                      time: analytics.ciLatencyComparison.traditional,
                    },
                    {
                      name: "CodePilot",
                      time: analytics.ciLatencyComparison.codePilot,
                    },
                  ]}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    label={{
                      value: "Seconds",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar
                    dataKey="time"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>LLM Feedback Quality</CardTitle>
              <CardDescription>Average user ratings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.llmFeedbackQuality}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    domain={[4, 5]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--success))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Repository Comparison</CardTitle>
            <CardDescription>
              Performance metrics across repositories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-foreground">
                      Repository
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-foreground">
                      PRs Analyzed
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-foreground">
                      Avg Failure Rate
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-foreground">
                      Avg Latency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.repositoryComparison.map((repo) => (
                    <tr
                      key={repo.repository}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {repo.repository}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {repo.prsAnalyzed}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {repo.avgFailureRate}%
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {repo.avgLatency}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
