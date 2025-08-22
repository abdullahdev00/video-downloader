import React, { useState } from "react";
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
  const { toast } = useToast();

  const generateDownloadLinkMutation = useMutation({
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
    onSuccess: (data) => {
      // Create download link and trigger download
      if (data.downloadUrl) {
        // Since we're now using server-side streaming, direct download should work
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = (videoInfo.title || 'video').replace(/[^a-zA-Z0-9]/g, '_') + '.' + (selectedOption?.format || 'mp4');
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        toast({
          title: "Download started",
          description: "Your download should begin shortly via our secure server",
        });
        
        // Clean up
        document.body.removeChild(link);
      }
    },
    onError: (error: any) => {
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
                <h4 className="text-white dark:text-white font-semibold text-lg leading-tight">
                  {videoInfo.title}
                </h4>
                <div className="flex items-center space-x-4 text-white/70 dark:text-white/70 text-sm">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {videoInfo.duration}
                  </span>
                  {videoInfo.viewCount && (
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {videoInfo.viewCount.toLocaleString()} views
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
                {(videoInfo.availableQualities as QualityOption[]).map((option: QualityOption) => (
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
                          {option.format.toUpperCase()} • {option.fileSize}
                        </span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {/* Download Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleDownload}
                  disabled={generateDownloadLinkMutation.isPending || !selectedQuality}
                  className={cn(
                    "flex-1 bg-emerald-600 hover:bg-emerald-700",
                    "text-white font-semibold py-3 px-6 rounded-xl",
                    "transition-all duration-300"
                  )}
                  data-testid="button-start-download"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {generateDownloadLinkMutation.isPending ? "Processing..." : "Download"}
                </Button>
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
