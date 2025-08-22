import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { PlatformGrid } from "@/components/platform-grid";
import { VideoDownloader } from "@/components/video-downloader";
import { VideoPreview } from "@/components/video-preview";
import { DownloadProgress } from "@/components/download-progress";
import { DownloadHistoryComponent } from "@/components/download-history";
import { FAQSection } from "@/components/faq-section";
import { cn } from "@/lib/utils";
import { Download, Moon, Sun } from "lucide-react";
import type { VideoInfo } from "@shared/schema";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<any>(null);

  const handleVideoInfoExtracted = (info: VideoInfo) => {
    setVideoInfo(info);
    setShowProgress(false);
  };

  const handleDownloadStart = (info: any) => {
    setDownloadInfo(info);
    setShowProgress(true);
  };

  const handleDownloadComplete = () => {
    setShowProgress(false);
  };

  return (
    <div className={cn(
      "min-h-screen transition-all duration-300",
      theme === "light" 
        ? "bg-gradient-to-br from-primary-500 to-secondary-500" 
        : "bg-gradient-to-br from-slate-900 to-slate-800"
    )}>
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-white/20 dark:bg-slate-800/50 backdrop-blur-[16px]",
              "border border-white/20 dark:border-white/10"
            )}>
              <Download className="text-white dark:text-white text-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white dark:text-white">
                VideoDownloader Pro
              </h1>
              <p className="text-white/70 dark:text-white/70 text-sm">
                Download videos from any platform
              </p>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <Button
            onClick={toggleTheme}
            variant="ghost"
            className={cn(
              "p-3 rounded-xl backdrop-blur-[16px] transition-all duration-300",
              "bg-white/10 dark:bg-slate-800/50 hover:bg-white/20 dark:hover:bg-slate-800/70",
              "border border-white/20 dark:border-white/10 text-white dark:text-white"
            )}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="container mx-auto px-4 pb-12">
        
        {/* Supported Platforms */}
        <PlatformGrid />

        {/* URL Input Section */}
        <VideoDownloader onVideoInfoExtracted={handleVideoInfoExtracted} />

        {/* Video Preview Section */}
        {videoInfo && (
          <VideoPreview 
            videoInfo={videoInfo} 
            onDownloadStart={handleDownloadStart}
          />
        )}

        {/* Progress Section */}
        {showProgress && downloadInfo && (
          <DownloadProgress
            isVisible={showProgress}
            downloadInfo={downloadInfo}
            onComplete={handleDownloadComplete}
          />
        )}

        {/* Download History Section */}
        <DownloadHistoryComponent />

        {/* FAQ and Legal Sections */}
        <FAQSection />
      </div>
    </div>
  );
}
