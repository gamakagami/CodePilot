import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

export default function PullRequest() {
  const [expandedFiles, setExpandedFiles] = useState<{ [key: string]: boolean }>({
    "app.js": true
  });

  const toggleFile = (fileName: string) => {
    setExpandedFiles(prev => ({ ...prev, [fileName]: !prev[fileName] }));
  };

  const prData = {
    id: 1,
    title: "Fix authentication bug in login flow",
    repo: "frontend-app",
    number: 123,
    author: "johndoe",
    date: "2024-01-15",
    status: "open",
    failureProbability: 0.82
  };

  const aiComments = [
    {
      id: 1,
      file: "app.js",
      line: 42,
      type: "warning",
      comment: "Consider using parameterized queries to prevent SQL injection vulnerabilities.",
    },
    {
      id: 2,
      file: "auth.js",
      line: 28,
      type: "suggestion",
      comment: "Consider adding input validation for email format before database query.",
    },
    {
      id: 3,
      file: "config.js",
      line: 15,
      type: "good",
      comment: "Good practice: environment variables are properly handled.",
    },
  ];

  const featureImportance = [
    { feature: "Files changed", value: 6, importance: "High" },
    { feature: "Avg complexity", value: 8.2, importance: "Medium" },
    { feature: "Lines added", value: 420, importance: "Medium" },
    { feature: "Build duration", value: "13m", importance: "Low" },
  ];

  const changedFiles = [
    { name: "app.js", additions: 45, deletions: 12 },
    { name: "auth.js", additions: 23, deletions: 8 },
    { name: "config.js", additions: 5, deletions: 2 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* PR Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h1 className="text-2xl font-bold text-foreground">{prData.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{prData.repo} #{prData.number}</span>
                <span>•</span>
                <span>by {prData.author}</span>
                <span>•</span>
                <span>{prData.date}</span>
                <Badge variant="outline" className="ml-2">Open</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reanalyze
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on GitHub
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Code Diff */}
          <div className="lg:col-span-2 space-y-6">
            {/* Failure Prediction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Failure Prediction</span>
                  <Badge variant="destructive" className="text-base">
                    {(prData.failureProbability * 100).toFixed(0)}% Risk
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Probability of CI Failure</span>
                    <span className="font-medium">{(prData.failureProbability * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={prData.failureProbability * 100} className="h-2" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Feature Importance</h4>
                  {featureImportance.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.feature}</span>
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{item.value}</span>
                        <Badge variant={
                          item.importance === "High" ? "destructive" :
                          item.importance === "Medium" ? "default" : "secondary"
                        } className="w-16 justify-center">
                          {item.importance}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Code Diff Viewer */}
            <Card>
              <CardHeader>
                <CardTitle>Changed Files ({changedFiles.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {changedFiles.map((file) => (
                  <div key={file.name} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleFile(file.name)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {expandedFiles[file.name] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-mono text-sm font-medium">{file.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-success">+{file.additions}</span>
                        <span className="text-destructive">-{file.deletions}</span>
                      </div>
                    </button>
                    
                    {expandedFiles[file.name] && (
                      <div className="border-t border-border bg-muted/30 p-4">
                        <pre className="text-xs font-mono">
                          <code className="text-muted-foreground">
                            // Code diff would be displayed here
                            // Showing additions and deletions
                          </code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Review */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiComments.map((comment) => (
                  <div key={comment.id} className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="flex items-start space-x-2">
                      {comment.type === "warning" && (
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      )}
                      {comment.type === "suggestion" && (
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      )}
                      {comment.type === "good" && (
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 space-y-2">
                        <div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {comment.file}:{comment.line}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.comment}</p>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Analysis Summary */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  Analysis generated in <span className="font-semibold text-foreground">27 seconds</span> using AI
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
