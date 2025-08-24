import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return 'Unknown';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatDuration(duration: string): string {
  return duration || '00:00';
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getSupportedPlatforms(): string[] {
  return [
    'youtube.com',
    'youtu.be',
    'tiktok.com',
    'instagram.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'vimeo.com',
    'reddit.com',
    'linkedin.com',
    'pinterest.com',
    'pin.it',
    'dailymotion.com',
    'dai.ly'
  ];
}

export function detectPlatformFromUrl(url: string): string {
  const supportedPlatforms = getSupportedPlatforms();
  const domain = supportedPlatforms.find(platform => url.includes(platform));
  
  if (!domain) return 'Unknown';
  
  if (domain.includes('youtube') || domain.includes('youtu.be')) return 'YouTube';
  if (domain.includes('tiktok')) return 'TikTok';
  if (domain.includes('instagram')) return 'Instagram';
  if (domain.includes('facebook')) return 'Facebook';
  if (domain.includes('twitter') || domain.includes('x.com')) return 'Twitter/X';
  if (domain.includes('vimeo')) return 'Vimeo';
  if (domain.includes('reddit')) return 'Reddit';
  if (domain.includes('linkedin')) return 'LinkedIn';
  if (domain.includes('pinterest') || domain.includes('pin.it')) return 'Pinterest';
  if (domain.includes('dailymotion') || domain.includes('dai.ly')) return 'Dailymotion';
  
  return 'Unknown';
}
