import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn, isValidUrl, getSupportedPlatforms } from "@/lib/utils";
import { Loader2, Download, Clipboard, X } from "lucide-react";

interface VideoDownloaderProps {
  onVideoInfoExtracted: (videoInfo: any) => void;
}

export function VideoDownloader({ onVideoInfoExtracted }: VideoDownloaderProps) {
  const [url, setUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/validate-url", { url });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        extractVideoInfo();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Invalid URL",
        description: error.message || "Please enter a URL from a supported platform",
        variant: "destructive",
      });
    },
  });

  const extractVideoInfoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/extract-video-info", { url });
      return response.json();
    },
    onSuccess: (data) => {
      onVideoInfoExtracted(data);
      toast({
        title: "Video information extracted",
        description: "Select your preferred quality and format below",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract video information",
        variant: "destructive",
      });
    },
  });

  const extractVideoInfo = () => {
    extractVideoInfoMutation.mutate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a video URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(url)) {
      toast({
        title: "Invalid URL format",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    const supportedPlatforms = getSupportedPlatforms();
    const isSupported = supportedPlatforms.some(platform => url.includes(platform));
    
    if (!isSupported) {
      toast({
        title: "Unsupported platform",
        description: "Please enter a URL from a supported platform",
        variant: "destructive",
      });
      return;
    }

    validateUrlMutation.mutate(url);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast({
        title: "URL pasted",
        description: "URL has been pasted from clipboard",
      });
    } catch (error) {
      toast({
        title: "Paste failed",
        description: "Could not access clipboard",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setUrl("");
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedUrl = e.dataTransfer.getData('text');
    if (droppedUrl) {
      setUrl(droppedUrl);
    }
  }, []);

  const isLoading = validateUrlMutation.isPending || extractVideoInfoMutation.isPending;

  return (
    <section className="max-w-4xl mx-auto mb-12">
      <Card className={cn(
        "glass-card rounded-3xl p-8",
        "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
        "border border-white/20 dark:border-white/10"
      )}>
        <CardContent className="p-0">
          <h3 className="text-center text-white dark:text-white text-2xl font-semibold mb-6">
            Paste Video URL Below
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div
                className={cn(
                  "relative",
                  isDragOver && "ring-2 ring-primary-500 ring-opacity-50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="url-drop-zone"
              >
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or any supported platform URL"
                  className={cn(
                    "w-full p-6 text-lg bg-white/10 dark:bg-slate-800/50",
                    "border-2 border-white/20 dark:border-white/10 rounded-2xl",
                    "text-white dark:text-white placeholder-white/50 dark:placeholder-white/30",
                    "focus:outline-none focus:border-primary-500 transition-all duration-300",
                    "pr-24",
                    isDragOver && "border-primary-500 bg-primary-500/5"
                  )}
                  disabled={isLoading}
                  data-testid="input-video-url"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePaste}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                    title="Paste from clipboard"
                    disabled={isLoading}
                    data-testid="button-paste"
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                    title="Clear input"
                    disabled={isLoading}
                    data-testid="button-clear"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Button
                type="submit"
                disabled={isLoading || !url.trim()}
                className={cn(
                  "bg-gradient-to-r from-primary-500 to-secondary-500",
                  "hover:from-primary-600 hover:to-secondary-600",
                  "text-white font-semibold py-4 px-12 rounded-2xl text-lg",
                  "transition-all duration-300 shadow-lg hover:shadow-xl",
                  "transform hover:-translate-y-1 disabled:opacity-50",
                  "disabled:cursor-not-allowed min-h-[56px] min-w-[200px]"
                )}
                data-testid="button-extract-info"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Get Video Info
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
