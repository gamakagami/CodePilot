import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useSyncRepositoryMutation, useReSyncMutation } from "@/api/dashboard";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SyncModalProps {
  open: boolean;
  onClose: () => void;
}

function SyncModal({ open, onClose }: SyncModalProps) {
  const [repoName, setRepoName] = useState("");
  const { toast } = useToast();

  const syncMutation = useSyncRepositoryMutation();
  const reSyncMutation = useReSyncMutation();

  const handleSyncRepo = async () => {
    if (!repoName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a repository name",
        variant: "destructive",
      });
      return;
    }

    try {
      await syncMutation.mutateAsync(repoName);
      toast({
        title: "Success",
        description: `Repository "${repoName}" synced successfully`,
      });
      setRepoName("");
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync repository. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReSync = async () => {
    try {
      await reSyncMutation.mutateAsync();
      toast({
        title: "Success",
        description: "All repositories re-synced successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to re-sync repositories. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isLoading = syncMutation.isPending || reSyncMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sync from GitHub</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Repository Name
            </label>
            <div className="flex space-x-2">
              <Input
                placeholder="repo-name"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleSyncRepo();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                variant="default"
                onClick={handleSyncRepo}
                disabled={isLoading || !repoName.trim()}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enter"
                )}
              </Button>
            </div>
          </div>
          <div className="relative flex items-center">
            <Separator className="flex-1" />
            <span className="px-2 text-sm text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleReSync}
            disabled={isLoading}
          >
            {reSyncMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Re-syncing...
              </>
            ) : (
              "Re-sync All Repositories"
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SyncModal;
