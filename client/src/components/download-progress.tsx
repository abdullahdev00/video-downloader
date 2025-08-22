import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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

    const steps = [
      { progress: 20, text: "Extracting video information..." },
      { progress: 40, text: "Preparing download..." },
      { progress: 70, text: "Generating download link..." },
      { progress: 90, text: "Finalizing..." },
      { progress: 100, text: "Download ready!" }
    ];

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex];
        setProgress(step.progress);
        setCurrentStep(step.text);
        
        if (step.progress === 100) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
        
        currentStepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <section className="max-w-2xl mx-auto mb-12 fade-in">
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
                className="w-full h-3 bg-white/10 dark:bg-slate-800/50"
                data-testid="progress-download"
              />
              <div className="text-white/80 dark:text-white/80 text-sm">
                {currentStep}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
