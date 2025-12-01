import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Legend
} from "recharts";
import { TrendingUp, Clock, Target, GitPullRequest } from "lucide-react";

export default function Insights() {
  const overviewMetrics = [
    { label: "Total PRs Analyzed", value: "156", icon: GitPullRequest },
    { label: "Average Model Accuracy", value: "0.87", icon: Target },
    { label: "Average Response Time", value: "24s", icon: Clock },
    { label: "Active Repositories", value: "3", icon: TrendingUp },
  ];

  const modelPerformanceData = [
    { date: "Jan 1", f1Score: 0.82 },
    { date: "Jan 8", f1Score: 0.84 },
    { date: "Jan 15", f1Score: 0.85 },
    { date: "Jan 22", f1Score: 0.87 },
    { date: "Jan 29", f1Score: 0.86 },
    { date: "Feb 5", f1Score: 0.88 },
  ];

  const latencyData = [
    { name: "Traditional CI", time: 180 },
    { name: "CodePilot", time: 24 },
  ];

  const feedbackQualityData = [
    { month: "Jan", rating: 4.2 },
    { month: "Feb", rating: 4.5 },
    { month: "Mar", rating: 4.3 },
    { month: "Apr", rating: 4.6 },
    { month: "May", rating: 4.7 },
  ];

  const repoComparisonData = [
    { name: "frontend-app", prs: 24, failureRate: 0.18, latency: 22 },
    { name: "backend-api", prs: 11, failureRate: 0.35, latency: 28 },
    { name: "mobile-client", prs: 19, failureRate: 0.22, latency: 25 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Insights & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track performance metrics and model accuracy across your repositories
          </p>
        </div>

        {/* Overview Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {overviewMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Over Time</CardTitle>
              <CardDescription>F1-Score trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={modelPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    domain={[0.8, 0.9]} 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="f1Score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CI Latency Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>CI Latency Comparison</CardTitle>
              <CardDescription>Traditional CI vs CodePilot feedback time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px"
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
        </div>

        {/* Feedback Quality Chart */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Feedback Quality</CardTitle>
            <CardDescription>Average user ratings over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedbackQualityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                    borderRadius: "6px"
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

        {/* Repository Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Comparison</CardTitle>
            <CardDescription>Performance metrics across repositories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-foreground">Repository</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-foreground">PRs Analyzed</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-foreground">Avg Failure Rate</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-foreground">Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {repoComparisonData.map((repo) => (
                    <tr key={repo.name} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 font-medium text-foreground">{repo.name}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{repo.prs}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {(repo.failureRate * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{repo.latency}s</td>
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
