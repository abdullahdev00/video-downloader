import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn, formatTimeAgo } from "@/lib/utils";
import { Trash2, RotateCcw, Link, History } from "lucide-react";
import type { DownloadHistory } from "@shared/schema";

export function DownloadHistoryComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery<DownloadHistory[]>({
    queryKey: ["/api/download-history"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/download-history");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/download-history"] });
      toast({
        title: "History cleared",
        description: "All download history has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear history",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/download-history/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/download-history"] });
      toast({
        title: "Item removed",
        description: "Download history item has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove item",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleDownloadAgain = (item: DownloadHistory) => {
    // Copy URL to clipboard for user to paste
    navigator.clipboard.writeText(item.url).then(() => {
      toast({
        title: "URL copied",
        description: "Video URL copied to clipboard. Paste it above to download again.",
      });
    });
  };

  const handleCopyLink = async (item: DownloadHistory) => {
    if (item.downloadUrl) {
      try {
        await navigator.clipboard.writeText(item.downloadUrl);
        toast({
          title: "Link copied",
          description: "Download link copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <section className="max-w-4xl mx-auto mb-12">
        <Card className={cn(
          "glass-card rounded-3xl p-8",
          "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
          "border border-white/20 dark:border-white/10"
        )}>
          <CardContent className="p-0">
            <div className="text-center py-8 text-white/50 dark:text-white/50">
              Loading history...
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto mb-12">
      <Card className={cn(
        "glass-card rounded-3xl p-8",
        "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
        "border border-white/20 dark:border-white/10"
      )}>
        <CardContent className="p-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white dark:text-white text-xl font-semibold">
              Recent Downloads
            </h3>
            {history.length > 0 && (
              <Button
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
                variant="outline"
                size="sm"
                className="text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white border-white/20 dark:border-white/10"
                data-testid="button-clear-history"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear History
              </Button>
            )}
          </div>
          
          <div className="space-y-3" data-testid="history-list">
            {history.length === 0 ? (
              <div className="text-center py-8 text-white/50 dark:text-white/50">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No download history yet</p>
                <p className="text-sm">Your recent downloads will appear here</p>
              </div>
            ) : (
              history.map((item: DownloadHistory) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center space-x-4 p-4 bg-white/5 dark:bg-slate-800/50",
                    "rounded-xl hover:bg-white/10 dark:hover:bg-slate-800/70 transition-colors"
                  )}
                  data-testid={`history-item-${item.id}`}
                >
                  <img
                    src={item.thumbnail || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=60"}
                    alt="Video thumbnail"
                    className="w-16 h-12 object-cover rounded-lg"
                    data-testid="img-history-thumbnail"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white dark:text-white font-medium truncate">
                      {item.title}
                    </h4>
                    <p className="text-white/70 dark:text-white/70 text-sm">
                      Downloaded {formatTimeAgo(new Date(item.createdAt!))} • {item.quality} • {item.fileSize}
                    </p>
                    <p className="text-white/50 dark:text-white/50 text-xs">
                      {item.platform}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleDownloadAgain(item)}
                      variant="ghost"
                      size="sm"
                      className="p-2 text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white transition-colors"
                      title="Download again"
                      data-testid={`button-download-again-${item.id}`}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    {item.downloadUrl && (
                      <Button
                        onClick={() => handleCopyLink(item)}
                        variant="ghost"
                        size="sm"
                        className="p-2 text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white transition-colors"
                        title="Copy link"
                        data-testid={`button-copy-link-${item.id}`}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteItemMutation.mutate(item.id)}
                      disabled={deleteItemMutation.isPending}
                      variant="ghost"
                      size="sm"
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove from history"
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
