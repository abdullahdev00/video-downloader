import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface DownloadProgressProps {
  isVisible: boolean;
  downloadInfo: {
    title: string;
    quality: string;
    platform: string;
  };
  onComplete: () => void;
}

export function DownloadProgress({ isVisible, downloadInfo, onComplete }: DownloadProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing download...");

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentStep("Initializing download...");
      return;
    }

    // Smoothly increment progress up to 95%
    setCurrentStep("Preparing download...");
    let raf: number;
    let localProgress = 0;
    const tick = () => {
      setProgress((prev) => {
        const next = Math.min(prev + 1, 95);
        localProgress = next;
        return next;
      });
      if (localProgress < 30) setCurrentStep("Extracting video information...");
      else if (localProgress < 60) setCurrentStep("Generating download link...");
      else if (localProgress < 90) setCurrentStep("Finalizing...");
      if (localProgress < 95) {
        raf = window.setTimeout(tick, 120); // ~12% per 1.2s => ~8-10s to reach 95%
      }
    };
    tick();

    // Finish only when browser download actually starts
    const handleStarted = () => {
      setCurrentStep("Download ready!");
      setProgress(100);
      setTimeout(() => onComplete(), 300);
    };
    window.addEventListener('download-started', handleStarted);

    return () => {
      window.removeEventListener('download-started', handleStarted);
      if (raf) window.clearTimeout(raf);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <section className="max-w-4xl mx-auto mb-12 fade-in">
      <Card className={cn(
        "glass-card rounded-3xl p-8",
        "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
        "border border-white/20 dark:border-white/10"
      )}>
        <CardContent className="p-0">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto">
              <Loader2 className="loading-spinner w-16 h-16 text-primary-500 animate-spin" />
            </div>
            
            <div>
              <h3 className="text-white dark:text-white text-xl font-semibold mb-2">
                Processing Video...
              </h3>
              <p className="text-white/70 dark:text-white/70">
                {downloadInfo.title}
              </p>
              <p className="text-white/50 dark:text-white/50 text-sm">
                {downloadInfo.platform} • {downloadInfo.quality}
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <Progress
                value={progress}
                className="w-full h-4 bg-white/10 dark:bg-slate-800/50"
                data-testid="progress-download"
              />
              <div className="text-white/80 dark:text-white/80 text-sm">
                {currentStep}
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    try { window.dispatchEvent(new CustomEvent('download-cancel')); } catch {}
                    onComplete();
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-xl transition-all duration-300"
                  data-testid="button-cancel-progress"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
