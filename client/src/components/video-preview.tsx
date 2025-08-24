import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn, formatTimeAgo } from "@/lib/utils";
import { Download, Link, Eye, User, Clock } from "lucide-react";
import type { VideoInfo, QualityOption } from "@shared/schema";

interface VideoPreviewProps {
  videoInfo: VideoInfo;
  onDownloadStart: (progress: any) => void;
}

export function VideoPreview({ videoInfo, onDownloadStart }: VideoPreviewProps) {
  const [selectedQuality, setSelectedQuality] = useState(
    (videoInfo.availableQualities as QualityOption[])[0]?.quality || ""
  );
  const [preparing, setPreparing] = useState(false);
  const [qualities, setQualities] = useState<QualityOption[]>(
    (videoInfo.availableQualities as QualityOption[])
  );
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const signalledRef = useRef(false);
  const canceledRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);

  function genToken() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function clearPollTimer() {
    if (pollTimerRef.current) {
      try { window.clearInterval(pollTimerRef.current); } catch {}
      pollTimerRef.current = null;
    }
  }

  // Listen for global cancel (from DownloadProgress or elsewhere)
  useEffect(() => {
    const onCancel = () => {
      canceledRef.current = true;
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch {}
        abortRef.current = null;
      }
      // Clear any pending iframe/timer before the browser starts the download
      if (fallbackTimerRef.current) {
        try { window.clearTimeout(fallbackTimerRef.current); } catch {}
        fallbackTimerRef.current = null;
      }
      clearPollTimer();
      if (iframeRef.current) {
        try { if (iframeRef.current.parentNode) iframeRef.current.parentNode.removeChild(iframeRef.current); } catch {}
        iframeRef.current = null;
      }
    };
    window.addEventListener('download-cancel', onCancel);
    return () => window.removeEventListener('download-cancel', onCancel);
  }, []);

  const generateDownloadLinkMutation = useMutation({
    mutationFn: async () => {
      // Prepare abort controller for this request
      const controller = new AbortController();
      abortRef.current = controller;
      canceledRef.current = false;
      signalledRef.current = false;
      const selectedOption = (qualities as QualityOption[]).find(
        (q: QualityOption) => q.quality === selectedQuality
      );
      
      const response = await apiRequest("POST", "/api/generate-download-link", {
        url: videoInfo.url,
        quality: selectedQuality,
        format: selectedOption?.format || "mp4"
      }, { signal: controller.signal });
      return { data: await response.json(), selectedOption };
    },
    onSuccess: ({ data, selectedOption }) => {
      abortRef.current = null;
      if (canceledRef.current) {
        // If user canceled before success returned, do nothing.
        return;
      }
      // Create download link and trigger download
      if (data.downloadUrl) {
        // Use hidden iframe to detect when the response actually starts
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframeRef.current = iframe;
        // Generate a token and append to URL so server drops a cookie when response begins
        const token = genToken();
        // Ensure universal compatibility for video by requesting compatible=1 (H.264/AAC MP4)
        let baseUrl = data.downloadUrl;
        const isAudioOnly = (selectedOption?.format || 'mp4') === 'mp3';
        if (!isAudioOnly && !/([?&])compatible=/.test(baseUrl)) {
          baseUrl += (baseUrl.includes('?') ? '&' : '?') + 'compatible=1';
        }
        const urlWithToken = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
        const signalStarted = () => {
          if (signalledRef.current) return;
          if (canceledRef.current) {
            // Canceled after iframe attached but before start; ensure cleanup
            try { if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current); } catch {}
            fallbackTimerRef.current = null;
            try { if (iframeRef.current && iframeRef.current.parentNode) iframeRef.current.parentNode.removeChild(iframeRef.current); } catch {}
            iframeRef.current = null;
            return;
          }
          signalledRef.current = true;
          if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
          clearPollTimer();
          try { window.dispatchEvent(new CustomEvent('download-started')); } catch {}
          // Download is already initiated by iframe navigation; avoid anchor click to prevent duplicate downloads
          // Cleanup iframe (delayed) so download is not interrupted
          setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); iframeRef.current = null; }, 1000);
        };
        iframe.onload = signalStarted;
        // Fallback timeout if onload doesn't fire
        const isSlowPlatform = ['TikTok', 'Instagram', 'Pinterest', 'YouTube'].includes(videoInfo.platform);
        // Allow more time for server-side transcode on slow platforms (esp. TikTok)
        const fallbackMs = isSlowPlatform ? 30000 : 8000;
        fallbackTimerRef.current = window.setTimeout(signalStarted, fallbackMs);
        iframe.src = urlWithToken;
        document.body.appendChild(iframe);

        // Poll for cookie to detect when browser has started handling the response
        clearPollTimer();
        pollTimerRef.current = window.setInterval(() => {
          if (canceledRef.current || signalledRef.current) return;
          const found = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('fileDownloadToken='));
          const val = found ? decodeURIComponent(found.split('=')[1]) : '';
          if (val && val === token) {
            signalStarted();
            // Clear cookie so it doesn't affect subsequent downloads
            try { document.cookie = 'fileDownloadToken=; Max-Age=0; Path=/; SameSite=Lax'; } catch {}
          }
        }, 1000) as unknown as number;

        toast({
          title: "Preparing download...",
          description: `Preparing ${selectedQuality} via secure server`,
        });

      }
    },
    onError: (error: any) => {
      abortRef.current = null;
      if (error?.name === 'AbortError') {
        // Silent cancel
        toast({ title: "Download canceled", description: "You canceled the download setup" });
        return;
      }
      setPreparing(false);
      toast({
        title: "Download failed",
        description: error.message || "Failed to generate download link",
        variant: "destructive",
      });
    },
  });

  const copyLinkMutation = useMutation({
    mutationFn: async () => {
      const selectedOption = (videoInfo.availableQualities as QualityOption[]).find(
        (q: QualityOption) => q.quality === selectedQuality
      );
      
      const response = await apiRequest("POST", "/api/generate-download-link", {
        url: videoInfo.url,
        quality: selectedQuality,
        format: selectedOption?.format || "mp4"
      });
      return response.json();
    },
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.downloadUrl);
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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate link",
        description: error.message || "Could not generate download link",
        variant: "destructive",
      });
    },
  });

  const handleDownload = () => {
    if (!selectedQuality) {
      toast({
        title: "No quality selected",
        description: "Please select a quality option",
        variant: "destructive",
      });
      return;
    }

    onDownloadStart({
      title: videoInfo.title,
      quality: selectedQuality,
      platform: videoInfo.platform
    });

    generateDownloadLinkMutation.mutate();
  };

  const handleCancel = () => {
    try { window.dispatchEvent(new CustomEvent('download-cancel')); } catch {}
  };

  const handleCopyLink = () => {
    if (!selectedQuality) {
      toast({
        title: "No quality selected",
        description: "Please select a quality option",
        variant: "destructive",
      });
      return;
    }

    copyLinkMutation.mutate();
  };

  return (
    <section className="max-w-4xl mx-auto mb-12 fade-in">
      <Card className={cn(
        "glass-card rounded-3xl p-8",
        "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
        "border border-white/20 dark:border-white/10"
      )}>
        <CardContent className="p-0">
          <h3 className="text-white dark:text-white text-xl font-semibold mb-6">
            Video Information
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Video Thumbnail & Details */}
            <div className="space-y-4">
              <img
                src={videoInfo.thumbnail || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450"}
                alt="Video thumbnail"
                className="w-full h-48 object-cover rounded-2xl shadow-lg"
                data-testid="img-video-thumbnail"
              />
              
              <div className="space-y-2">
                <h4 className="text-white dark:text-white font-semibold text-lg leading-tight line-clamp-2">
                  {videoInfo.title}
                </h4>
                <div className="flex items-center space-x-4 text-white/70 dark:text-white/70 text-sm">
                  {videoInfo.duration && videoInfo.duration !== 'Unknown' && (
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {videoInfo.duration}
                    </span>
                  )}
                  {videoInfo.viewCount && (
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {Intl.NumberFormat().format(videoInfo.viewCount)} views
                    </span>
                  )}
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {videoInfo.uploader}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quality Options */}
            <div className="space-y-4">
              <h5 className="text-white dark:text-white font-medium">
                Select Quality & Format
              </h5>
              
              <RadioGroup
                value={selectedQuality}
                onValueChange={setSelectedQuality}
                className="space-y-3"
                data-testid="radio-group-quality"
              >
                {(qualities as QualityOption[]).map((option: QualityOption) => (
                  <div key={option.quality}>
                    <Label
                      htmlFor={option.quality}
                      className={cn(
                        "flex items-center space-x-3 p-4 bg-white/5 dark:bg-slate-800/50",
                        "rounded-xl hover:bg-white/10 dark:hover:bg-slate-800/70",
                        "transition-colors cursor-pointer"
                      )}
                    >
                      <RadioGroupItem
                        value={option.quality}
                        id={option.quality}
                        className="text-primary-500 focus:ring-primary-500"
                        data-testid={`radio-quality-${option.quality.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-white dark:text-white font-medium">
                          {option.quality}
                        </span>
                        <span className="text-white/70 dark:text-white/70 text-sm">
                          {option.format.toUpperCase()}
                        </span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {/* Download Action Buttons */}
              <div className="flex space-x-3 pt-4">
                {generateDownloadLinkMutation.isPending ? (
                  <Button
                    onClick={handleCancel}
                    className={cn(
                      "flex-1 bg-red-600 hover:bg-red-700",
                      "text-white font-semibold py-3 px-6 rounded-xl",
                      "transition-all duration-300"
                    )}
                    data-testid="button-cancel-download"
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    onClick={handleDownload}
                    disabled={!selectedQuality}
                    className={cn(
                      "flex-1 bg-emerald-600 hover:bg-emerald-700",
                      "text-white font-semibold py-3 px-6 rounded-xl",
                      "transition-all duration-300"
                    )}
                    data-testid="button-start-download"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
                <Button
                  onClick={handleCopyLink}
                  disabled={copyLinkMutation.isPending || !selectedQuality}
                  variant="outline"
                  className={cn(
                    "bg-white/10 dark:bg-slate-800/50 hover:bg-white/20 dark:hover:bg-slate-800/70",
                    "text-white dark:text-white font-semibold py-3 px-6 rounded-xl",
                    "border-white/20 dark:border-white/10 transition-all duration-300"
                  )}
                  data-testid="button-copy-link"
                >
                  <Link className="mr-2 h-4 w-4" />
                  {copyLinkMutation.isPending ? "Generating..." : "Copy Link"}
                </Button>
              </div>
            </div>
          </div>
          
        </CardContent>
      </Card>
    </section>
  );
}
