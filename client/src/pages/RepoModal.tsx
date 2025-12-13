import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

type PullRequestSummary = {
  id: number;
  title: string;
  author: string;
  status: string;
  createdAt?: string | null;
  riskScore?: number | null;
  analysisDuration?: number | null;
  predictedFailure?: boolean | null;
  actualFailure?: boolean | null;
  rating?: number | null;
};

type Repo = {
  id: number;
  name: string;
  lastAnalyzed?: string | null;
  failureRate?: number | null;
  pullRequests?: PullRequestSummary[];
};

interface RepoModalProps {
  open: boolean;
  onClose: () => void;
  repo: Repo | null;
}

export default function RepoModal({ open, onClose, repo }: RepoModalProps) {
  const navigate = useNavigate();

  if (!repo) return null;

  const handleOpenPR = (prId: number) => {
    onClose();
    navigate(`/pullRequest/${prId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-[1000px] min-h-[300px]">
        <DialogHeader>
          <DialogTitle>Repository: {repo.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last analyzed</p>
              <p className="font-medium">{repo.lastAnalyzed ?? "Never"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failure rate</p>
              <p className="font-medium">
                {repo.failureRate !== null && repo.failureRate !== undefined
                  ? `${repo.failureRate}%`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open PRs</p>
              <Badge>{repo.pullRequests?.length ?? 0}</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2">Pull Requests</h4>
            {(!repo.pullRequests || repo.pullRequests.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No pull requests for this repository.
              </p>
            )}

            <div className="space-y-2">
              {(repo.pullRequests || []).map((pr) => (
                <div
                  key={pr.id}
                  className="p-3 border border-border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <h5 className="font-medium text-foreground truncate">
                      {pr.title}
                    </h5>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pr.author} •{" "}
                      {pr.createdAt
                        ? new Date(pr.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">
                        {pr.riskScore !== null && pr.riskScore !== undefined
                          ? `${(pr.riskScore * 100).toFixed(0)}%`
                          : "N/A"}
                      </p>
                      <p className="text-muted-foreground">Risk score</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {pr.analysisDuration ?? "-"}
                      </p>
                      <p className="text-muted-foreground">Duration (s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {pr.predictedFailure ? "Yes" : "No"}
                      </p>
                      <p className="text-muted-foreground">Predicted</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {pr.actualFailure ? "Yes" : "No"}
                      </p>
                      <p className="text-muted-foreground">Actual</p>
                    </div>
                    <div>
                      <p className="text-sm">Rating</p>
                      <p className="font-medium">{pr.rating ?? "-"}</p>
                    </div>
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenPR(pr.id)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
