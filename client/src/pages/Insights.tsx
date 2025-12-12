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
import { useState } from "react";

export default function Insights() {
  const { data, isLoading, isError } = useAnalyticsQuery();
  const [timeFilter, setTimeFilter] = useState<"week" | "month">("week");

  const getFilteredFeedback = () => {
    const now = new Date("2025-12-12");
    const days = timeFilter === "week" ? 7 : 30;
    const generatedData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dateStr = date.toISOString().split("T")[0];
      const displayDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const existingData = data?.llmFeedbackHistory?.find((item) => {
        const itemDate = new Date(item.createdAt).toISOString().split("T")[0];
        return itemDate === dateStr;
      });

      generatedData.push({
        date: displayDate,
        rating: existingData?.rating || 0,
        createdAt: dateStr,
      });
    }

    return generatedData;
  };

  // Sync codePilot latency with averageResponseTime
  const ciLatencyData = data
    ? [
        {
          name: "Traditional CI",
          time: 600,
        },
        {
          name: "CodePilot",
          time: data.averageResponseTime,
        },
      ]
    : [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-destructive">Failed to load analytics data</div>
        </div>
      </DashboardLayout>
    );
  }

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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total PRs Analyzed",
              value: data.totalPRsAnalyzed,
              icon: GitPullRequest,
            },
            {
              label: "Average Model Accuracy",
              value: `${data.successRate}%`,
              icon: Target,
            },
            {
              label: "Average Response Time",
              value: `${data.averageResponseTime}s`,
              icon: Clock,
            },
            {
              label: "Active Repositories",
              value: data.activeRepositories,
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
                <BarChart data={ciLatencyData}>
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

          {/* LLM Feedback Quality with Time Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LLM Feedback Quality</CardTitle>
                  <CardDescription>
                    Average user ratings over time
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeFilter("week")}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      timeFilter === "week"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    1 Week
                  </button>
                  <button
                    onClick={() => setTimeFilter("month")}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      timeFilter === "month"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    1 Month
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getFilteredFeedback()}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    domain={[0, 5]}
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

        {/* Repository Comparison Table */}
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
                  {data.repositoryComparison.map((repo) => (
                    <tr
                      key={repo.name}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {repo.name}
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
