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
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  usePullRequestQuery,
  useRatePullRequestMutation,
  useSubmitPullRequestMutation,
  useSubmitFeedbackMutation,
} from "@/api/analytics";
import { useToast } from "@/components/ui/use-toast";
import { useFetchProfile } from "@/api/setting";

function PullRequest() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = usePullRequestQuery(id || "");
  const rateMutation = useRatePullRequestMutation();
  const submitMutation = useSubmitPullRequestMutation();
  const feedbackMutation = useSubmitFeedbackMutation();
  const [expandedFiles, setExpandedFiles] = useState<{
    [key: string]: boolean;
  }>({});
  const [userRating, setUserRating] = useState<number | null>(null);
  const { data: profileData } = useFetchProfile();

  const toggleFile = (fileName: string) => {
    setExpandedFiles((prev) => ({ ...prev, [fileName]: !prev[fileName] }));
  };

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRating = async (rating: number) => {
    if (!id) return;
    if (!data?.analysisDuration) return;
    if (data?.rating != null) return;

    setUserRating(rating);

    try {
      await rateMutation.mutateAsync({ prId: id, rating });
      toast({
        title: "Thanks",
        description: "Your rating was submitted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!data) return;

    const latestRatingFromHistory =
      data.ratingHistory && data.ratingHistory.length
        ? data.ratingHistory[data.ratingHistory.length - 1].rating
        : null;

    const initialRating =
      latestRatingFromHistory ?? (data.rating ? Math.round(data.rating) : null);

    setUserRating(initialRating as number | null);
  }, [data]);

  const prData = data
    ? {
        id: data.id,
        title: data.title,
        number: data.number,
        author: data.author,
        repository: data.repository,
        date: data.createdAt
          ? new Date(data.createdAt).toLocaleDateString()
          : "Unknown",
        status: data.status,
        failureProbability: data.riskScore || 0,
      }
    : null;

  const aiComments = (data?.reviewComments || []).map((comment) => ({
    id: comment.id,
    file: comment.file,
    line: comment.line,
    type: "warning",
    comment: comment.comment,
  }));

  const changedFiles = (data?.changedFiles || []).map((file) => ({
    name: file.filename,
    additions: file.additions,
    deletions: file.deletions,
    diff: file.diff,
  }));

  const featureImportance = [
    {
      feature: "Files changed",
      value: changedFiles.length,
      importance: "High",
    },
    {
      feature: "Risk Score",
      value: data?.riskScore ? (data.riskScore * 100).toFixed(0) : "0",
      importance: data?.riskScore
        ? data.riskScore > 0.7
          ? "High"
          : data.riskScore > 0.4
          ? "Medium"
          : "Low"
        : "Low",
    },
    {
      feature: "Analysis Duration",
      value: data?.analysisDuration
        ? `${data.analysisDuration.toFixed(1)}s`
        : "0s",
      importance: "Low",
    },
    {
      feature: "Predicted Failure",
      value: data?.predictedFailure ? "Yes" : "No",
      importance: data?.predictedFailure ? "High" : "Low",
    },
  ];

  return (
    <DashboardLayout>
      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading pull request...</p>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-destructive">
            Failed to load pull request. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !isError && prData && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="p-0 hover:opacity-70 transition-opacity"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h1 className="text-2xl font-bold text-foreground">
                    {prData.title}
                  </h1>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>{prData.repository}</span>
                  <span>•</span>
                  <span>#{prData.number}</span>
                  <span>•</span>
                  <span>by {prData.author}</span>
                  <span>•</span>
                  <span>{prData.date}</span>
                  <Badge variant="outline" className="ml-2">
                    {prData.status.charAt(0).toUpperCase() +
                      prData.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => id && submitMutation.mutate({ prId: id })}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
          
                  </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
                {(() => {
                  const githubUrl = profileData?.githubUsername
                    ? `https://github.com/${data.author}/${data.repository}/pull/${data?.number}`
                    : undefined;

                  return (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      disabled={!githubUrl}
                    >
                      {githubUrl ? (
                        <a
                          href={githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View on GitHub
                        </a>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View on GitHub
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Failure Prediction</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-muted-foreground">
                        Probability of CI Failure
                      </span>
                      <span className="font-medium">
                        {(prData.failureProbability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={prData.failureProbability * 100}
                      className="h-2"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      Feature Importance
                    </h4>
                    {featureImportance.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {item.feature}
                        </span>
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Changed Files ({changedFiles.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {changedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="border border-border rounded-lg overflow-hidden"
                    >
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
                          <span className="font-mono text-sm font-medium">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <span className="text-success">
                            +{file.additions}
                          </span>
                          <span className="text-destructive">
                            -{file.deletions}
                          </span>
                        </div>
                      </button>

                      {expandedFiles[file.name] && (
                        <div className="border-t border-border bg-muted/30 p-4">
                          <pre className="text-xs font-mono">
                            <code className="text-muted-foreground">
                              // Code diff would be displayed here // Showing
                              additions and deletions
                            </code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
              {/* Feedback box - only show when actualFailure is not yet set */}
              <Card>
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.actualFailure === null ||
                  data?.actualFailure === undefined ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        What was the result of the pull request?
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (!id) return;
                            try {
                              await feedbackMutation.mutateAsync({
                                prId: id,
                                actualFailure: true,
                              });
                              toast({
                                title: "Thanks",
                                description: "Feedback submitted.",
                              });
                            } catch (err) {
                              toast({
                                title: "Error",
                                description: "Failed to submit feedback.",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={feedbackMutation.isPending}
                        >
                          Failure
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (!id) return;
                            try {
                              await feedbackMutation.mutateAsync({
                                prId: id,
                                actualFailure: false,
                              });
                              toast({
                                title: "Thanks",
                                description: "Feedback submitted.",
                              });
                            } catch (err) {
                              toast({
                                title: "Error",
                                description: "Failed to submit feedback.",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={feedbackMutation.isPending}
                        >
                          Success
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Feedback: </span>
                      <span className="font-medium">
                        {data?.actualFailure
                          ? "Yes — resulted in failure"
                          : "No — did not result in failure"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0"
                    >
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
                          <p className="text-sm text-foreground">
                            {comment.comment}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Analysis generated in{" "}
                    <span className="font-semibold text-foreground">
                      {data?.analysisDuration
                        ? data.analysisDuration.toFixed(1)
                        : "0"}{" "}
                      seconds
                    </span>{" "}
                    using AI
                  </p>

                  <Separator />

                  {data?.rating != null ? (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="text-foreground font-semibold">
                        {Number(data.rating).toFixed(1)} / 5
                      </p>
                    </div>
                  ) : data?.analysisDuration == null ? (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Analysis not available yet — rating disabled
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground text-center">
                        Rate this analysis
                      </p>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Button
                            key={rating}
                            variant={
                              userRating === rating ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handleRating(rating)}
                            disabled={
                              rateMutation.isPending || !data?.analysisDuration
                            }
                            className="w-10 h-10 p-0"
                          >
                            ⭐
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default PullRequest;
