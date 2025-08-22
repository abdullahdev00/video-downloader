import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { videoExtractor } from "./services/video-extractor";
import { urlValidationSchema, downloadRequestSchema, insertDownloadHistorySchema } from "@shared/schema";
import rateLimit from "express-rate-limit";

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: { error: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === 'development' // Skip rate limiting in development
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit downloads to 10 per minute
  message: { error: "Download rate limit exceeded, please wait before trying again." },
  skip: () => process.env.NODE_ENV === 'development' // Skip rate limiting in development
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply rate limiting to all API routes
  app.use('/api', limiter);

  // Validate video URL and extract platform
  app.post('/api/validate-url', async (req, res) => {
    try {
      const { url } = urlValidationSchema.parse(req.body);
      
      const platform = videoExtractor.detectPlatform(url);
      
      res.json({
        valid: true,
        platform,
        url
      });
    } catch (error: any) {
      res.status(400).json({
        valid: false,
        error: error.message || "Invalid URL or unsupported platform"
      });
    }
  });

  // Extract video information
  app.post('/api/extract-video-info', async (req, res) => {
    try {
      const { url } = urlValidationSchema.parse(req.body);
      
      // Check cache first
      const cachedInfo = await storage.getVideoInfo(url);
      if (cachedInfo) {
        return res.json(cachedInfo);
      }

      // Extract new video info
      const videoInfo = await videoExtractor.extractVideoInfo(url);
      
      // Save to cache
      const savedInfo = await storage.saveVideoInfo({
        url,
        platform: videoInfo.platform,
        title: videoInfo.title,
        description: videoInfo.description,
        thumbnail: videoInfo.thumbnail,
        duration: videoInfo.duration,
        uploader: videoInfo.uploader,
        viewCount: videoInfo.viewCount,
        availableQualities: videoInfo.availableQualities
      });

      res.json(savedInfo);
    } catch (error: any) {
      res.status(500).json({
        error: error.message || "Failed to extract video information"
      });
    }
  });

  // Generate download link with server-side streaming
  app.post('/api/generate-download-link', downloadLimiter, async (req, res) => {
    try {
      const { url, quality, format } = downloadRequestSchema.parse(req.body);
      
      // Instead of returning direct URL, return our streaming endpoint
      const streamingUrl = `/api/stream-video?url=${encodeURIComponent(url)}&quality=${encodeURIComponent(quality)}&format=${encodeURIComponent(format)}`;
      
      // Add to download history
      const videoInfo = await storage.getVideoInfo(url);
      if (videoInfo) {
        await storage.addDownloadHistory({
          url,
          platform: videoInfo.platform,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          duration: videoInfo.duration,
          quality,
          format,
          fileSize: (videoInfo.availableQualities as any[]).find((q: any) => q.quality === quality)?.fileSize || 'Unknown',
          downloadUrl: streamingUrl,
          status: 'completed'
        });
      }

      res.json({
        downloadUrl: streamingUrl,
        expiresIn: '24 hours' // Our streaming endpoint doesn't expire
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message || "Failed to generate download link"
      });
    }
  });

  // Stream video endpoint - bypasses all platform restrictions
  app.get('/api/stream-video', async (req, res) => {
    try {
      const { url, quality, format } = req.query as { url: string; quality: string; format: string };
      
      if (!url || !quality || !format) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Get actual download URL using yt-dlp
      const actualDownloadUrl = await videoExtractor.generateDownloadLink(url, quality, format);
      
      // Get video info for filename
      const videoInfo = await storage.getVideoInfo(url);
      const filename = videoInfo ? 
        `${videoInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}` : 
        `video.${format}`;
      
      // Set headers for download
      res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      
      // Use fetch to get the video data and stream it
      const fetch = (await import('node-fetch')).default;
      
      const videoResponse = await fetch(actualDownloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'video',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
        }
      });

      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }

      // Set content length if available
      const contentLength = videoResponse.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Stream the video data to client
      videoResponse.body?.pipe(res);
      
    } catch (error: any) {
      console.error('Stream video error:', error);
      res.status(500).json({
        error: error.message || "Failed to stream video"
      });
    }
  });

  // Get download history
  app.get('/api/download-history', async (req, res) => {
    try {
      const history = await storage.getDownloadHistory();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({
        error: error.message || "Failed to fetch download history"
      });
    }
  });

  // Clear download history
  app.delete('/api/download-history', async (req, res) => {
    try {
      await storage.clearDownloadHistory();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        error: error.message || "Failed to clear download history"
      });
    }
  });

  // Delete specific download history item
  app.delete('/api/download-history/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDownloadHistory(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        error: error.message || "Failed to delete download history item"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
