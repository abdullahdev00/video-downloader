import { spawn } from "child_process";
import { ExtractedVideoInfo, QualityOption } from "@shared/schema";

export class VideoExtractorService {
  private supportedPlatforms = [
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
    'dailymotion.com'
  ];

  detectPlatform(url: string): string {
    const domain = this.supportedPlatforms.find(platform => url.includes(platform));
    if (!domain) {
      throw new Error('Unsupported platform');
    }
    
    if (domain.includes('youtube') || domain.includes('youtu.be')) return 'YouTube';
    if (domain.includes('tiktok')) return 'TikTok';
    if (domain.includes('instagram')) return 'Instagram';
    if (domain.includes('facebook')) return 'Facebook';
    if (domain.includes('twitter') || domain.includes('x.com')) return 'Twitter/X';
    if (domain.includes('vimeo')) return 'Vimeo';
    if (domain.includes('reddit')) return 'Reddit';
    if (domain.includes('linkedin')) return 'LinkedIn';
    if (domain.includes('pinterest')) return 'Pinterest';
    if (domain.includes('dailymotion')) return 'Dailymotion';
    
    return 'Unknown';
  }

  async extractVideoInfo(url: string): Promise<ExtractedVideoInfo> {
    return new Promise((resolve, reject) => {
      const platform = this.detectPlatform(url);
      
      // Use yt-dlp to extract video information
      const ytDlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-warnings',
        url
      ]);

      let output = '';
      let errorOutput = '';

      ytDlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytDlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Video extraction failed: ${errorOutput}`));
          return;
        }

        try {
          const videoData = JSON.parse(output);
          const extractedInfo: ExtractedVideoInfo = {
            title: videoData.title || 'Unknown Title',
            description: videoData.description,
            thumbnail: videoData.thumbnail || '',
            duration: this.formatDuration(videoData.duration),
            uploader: videoData.uploader || videoData.channel || 'Unknown',
            viewCount: videoData.view_count,
            platform,
            availableQualities: this.extractQualities(videoData.formats || [])
          };

          resolve(extractedInfo);
        } catch (error) {
          reject(new Error(`Failed to parse video data: ${error}`));
        }
      });

      ytDlp.on('error', (error) => {
        reject(new Error(`yt-dlp execution failed: ${error.message}`));
      });
    });
  }

  async generateDownloadLink(url: string, quality: string, format: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['--get-url', '--no-warnings'];
      
      if (format === 'mp3') {
        args.push('--extract-audio', '--audio-format', 'mp3');
      } else {
        args.push('--format', this.getFormatSelector(quality));
      }
      
      args.push(url);
      
      const ytDlp = spawn('yt-dlp', args);
      
      let output = '';
      let errorOutput = '';

      ytDlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytDlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Download link generation failed: ${errorOutput}`));
          return;
        }

        const downloadUrl = output.trim().split('\n')[0];
        resolve(downloadUrl);
      });

      ytDlp.on('error', (error) => {
        reject(new Error(`yt-dlp execution failed: ${error.message}`));
      });
    });
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private extractQualities(formats: any[]): QualityOption[] {
    const qualityMap = new Map<string, QualityOption>();
    
    // Add audio-only option
    qualityMap.set('audio', {
      quality: 'Audio Only',
      format: 'mp3',
      fileSize: 'Variable'
    });

    formats.forEach(format => {
      if (format.height && format.vcodec !== 'none') {
        const quality = `${format.height}p`;
        const fileSize = format.filesize ? this.formatFileSize(format.filesize) : 'Unknown';
        
        if (!qualityMap.has(quality) || qualityMap.get(quality)!.fileSize === 'Unknown') {
          qualityMap.set(quality, {
            quality: quality === '2160p' ? '4K' : quality === '1440p' ? '2K' : quality,
            format: 'mp4',
            fileSize
          });
        }
      }
    });

    // Sort qualities by resolution
    const sortedQualities = Array.from(qualityMap.values()).sort((a, b) => {
      if (a.quality === 'Audio Only') return 1;
      if (b.quality === 'Audio Only') return -1;
      
      const aHeight = parseInt(a.quality.replace(/\D/g, '')) || 0;
      const bHeight = parseInt(b.quality.replace(/\D/g, '')) || 0;
      
      return bHeight - aHeight;
    });

    return sortedQualities;
  }

  private formatFileSize(bytes: number): string {
    if (!bytes) return 'Unknown';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  private getFormatSelector(quality: string): string {
    switch (quality) {
      case '4K':
      case '2160p':
        return 'best[height<=2160]';
      case '2K':
      case '1440p':
        return 'best[height<=1440]';
      case '1080p':
        return 'best[height<=1080]';
      case '720p':
        return 'best[height<=720]';
      case '480p':
        return 'best[height<=480]';
      case '360p':
        return 'best[height<=360]';
      case '240p':
        return 'best[height<=240]';
      default:
        return 'best';
    }
  }
}

export const videoExtractor = new VideoExtractorService();
