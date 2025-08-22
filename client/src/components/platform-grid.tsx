import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Platform {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

const platforms: Platform[] = [
  {
    name: "YouTube",
    icon: "fab fa-youtube",
    color: "text-white",
    bgColor: "bg-red-600"
  },
  {
    name: "TikTok",
    icon: "fab fa-tiktok",
    color: "text-white",
    bgColor: "bg-black"
  },
  {
    name: "Instagram",
    icon: "fab fa-instagram",
    color: "text-white",
    bgColor: "bg-gradient-to-r from-purple-500 to-pink-500"
  },
  {
    name: "Facebook",
    icon: "fab fa-facebook-f",
    color: "text-white",
    bgColor: "bg-blue-600"
  },
  {
    name: "Twitter/X",
    icon: "fab fa-x-twitter",
    color: "text-white",
    bgColor: "bg-black"
  },
  {
    name: "Vimeo",
    icon: "fab fa-vimeo-v",
    color: "text-white",
    bgColor: "bg-blue-500"
  },
  {
    name: "Reddit",
    icon: "fab fa-reddit-alien",
    color: "text-white",
    bgColor: "bg-orange-600"
  },
  {
    name: "LinkedIn",
    icon: "fab fa-linkedin-in",
    color: "text-white",
    bgColor: "bg-blue-700"
  }
];

export function PlatformGrid() {
  return (
    <section className="mb-12">
      <h2 className="text-center text-white dark:text-white text-xl font-semibold mb-8">
        Supported Platforms
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4 max-w-5xl mx-auto">
        {platforms.map((platform) => (
          <Card
            key={platform.name}
            className={cn(
              "platform-icon glass-card rounded-2xl p-4 text-center cursor-pointer group",
              "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
              "border border-white/20 dark:border-white/10",
              "hover:bg-white/20 dark:hover:bg-slate-900/80",
              "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            )}
            data-testid={`platform-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          >
            <div className={cn(
              "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center",
              platform.bgColor
            )}>
              <i className={cn(platform.icon, platform.color, "text-xl")} />
            </div>
            <span className="text-white dark:text-white text-sm font-medium">
              {platform.name}
            </span>
          </Card>
        ))}
      </div>
    </section>
  );
}
