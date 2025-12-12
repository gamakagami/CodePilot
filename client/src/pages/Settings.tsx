import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFetchProfile } from "@/api/profile";

export default function Settings() {
  const { data } = useFetchProfile();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and system configuration
          </p>
        </div>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>
              Your personal information from GitHub
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={data?.avatarUrl || ""} alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {data?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {data?.name || "User"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{data?.githubUsername || "username"}
                </p>
                <Badge>Developer</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" defaultValue={data?.name || ""} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">GitHub Username</Label>
                <Input
                  id="username"
                  value={data?.githubUsername || ""}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Your GitHub username cannot be changed
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={data?.email || ""}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button>Save Changes</Button>
              <Button variant="destructive" className="ml-auto">
                Disconnect GitHub Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API & Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>API & Integration Settings</CardTitle>
            <CardDescription>
              Configure external services and API keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                API keys are encrypted and stored securely. Never share your API
                keys publicly.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="claudeKey">Claude API Key</Label>
                <Input
                  id="claudeKey"
                  type="password"
                  placeholder="sk-ant-..."
                  defaultValue={data?.claudeApiKey || ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="githubToken">GitHub Token</Label>
                <Input
                  id="githubToken"
                  value={
                    data?.githubToken
                      ? `${data.githubToken.substring(0, 7)}${"•".repeat(10)}`
                      : ""
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Generated via OAuth authentication
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="modelEndpoint">Model Endpoint (Optional)</Label>
                <Input
                  id="modelEndpoint"
                  placeholder="https://ml.codepilot.ai/predict"
                  defaultValue={data?.modelEndpoint || ""}
                />
              </div>
            </div>

            <Button>Update API Keys</Button>
          </CardContent>
        </Card>

        {/* Prediction & Review Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Prediction & Review Settings</CardTitle>
            <CardDescription>
              Configure AI model behavior and thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="riskThreshold">Risk Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {data?.riskThreshold?.toFixed(2) || "0.50"}
                  </span>
                </div>
                <Slider
                  id="riskThreshold"
                  defaultValue={[
                    Math.round((data?.riskThreshold || 0.5) * 100),
                  ]}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  PRs with failure probability above this threshold will be
                  flagged as high risk
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable LLM Review</Label>
                  <p className="text-xs text-muted-foreground">
                    Use Claude AI for automated code review comments
                  </p>
                </div>
                <Switch defaultChecked={data?.enableLlmReview || false} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable ML Prediction</Label>
                  <p className="text-xs text-muted-foreground">
                    Use machine learning model for test failure prediction
                  </p>
                </div>
                <Switch defaultChecked={data?.enableMlPrediction || false} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Current application and model versions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">App Version</Label>
                <p className="text-foreground font-medium mt-1">v1.2.0</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Model Version</Label>
                <p className="text-foreground font-medium mt-1">v1.2</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Server Status</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span className="text-foreground font-medium">Online</span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Updated</Label>
                <p className="text-foreground font-medium mt-1">
                  {data?.updatedAt
                    ? new Date(data.updatedAt).toLocaleDateString("en-CA")
                    : "2025-01-10"}
                </p>
              </div>
            </div>

            <Separator />

            <Button variant="outline">Retrain Model</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
