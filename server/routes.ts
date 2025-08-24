import type { Express } from "express";
import { spawn } from "child_process";
import { createServer, type Server } from "http";
import fs from 'fs';
import os from 'os';
import path from 'path';
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

      // Fire-and-forget: background probe to enrich sizes and update cache
      (async () => {
        try {
          const probed = await videoExtractor.probeQualities(url);
          if (Array.isArray(probed) && probed.length) {
            const orig = (savedInfo.availableQualities as any[]) || [];
            // Build a map from probed first (it generally has correct availability and sizes)
            const map = new Map<string, any>();
            for (const p of probed) {
              map.set(p.quality, { ...p });
            }
            // Overlay any original entries that don't exist in probed
            for (const q of orig) {
              if (!map.has(q.quality)) {
                map.set(q.quality, q);
              } else {
                const current = map.get(q.quality);
                // Prefer known fileSize from probed, else keep original
                if (!current.fileSize || current.fileSize === 'Unknown') {
                  current.fileSize = q.fileSize;
                }
                if (!current.format && q.format) {
                  current.format = q.format;
                }
                map.set(q.quality, current);
              }
            }
            const merged = Array.from(map.values());
            await storage.updateVideoInfo(url, { availableQualities: merged as any });
          }
        } catch (e) {
          console.warn('Background probe failed:', (e as any)?.message || e);
        }
      })();

      res.json(savedInfo);
    } catch (error: any) {
      res.status(500).json({
        error: error.message || "Failed to extract video information"
      });
    }
  });

  // Poll cached video info (used by client to update sizes when background probe completes)
  app.get('/api/video-info', async (req, res) => {
    try {
      const url = String(req.query.url || '');
      if (!url) return res.status(400).json({ error: 'Missing url' });
      const info = await storage.getVideoInfo(url);
      if (!info) return res.status(404).json({ error: 'Not found' });
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch video info' });
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
      const token = String((req.query as any).token || '');
      
      if (!url || !quality || !format) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      console.log(`Streaming video: ${url}, quality: ${quality}, format: ${format}`);
      const compatParam = String(req.query.compatible || '').toLowerCase();

      // Get actual download URL using yt-dlp
      const actualDownloadUrl = await videoExtractor.generateDownloadLink(url, quality, format);
      console.log(`Actual download URL obtained: ${actualDownloadUrl.substring(0, 50)}...`);
      
      // Get video info for base filename (extension will be adjusted later)
      const videoInfo = await storage.getVideoInfo(url);
      const baseName = videoInfo ? 
        `${videoInfo.title.replace(/[^a-zA-Z0-9\s]/g, '_')}` : 
        `video`;
      
      // If a token is provided, set a cookie so the client can detect when download starts
      if (token) {
        const existing = res.getHeader('Set-Cookie');
        const cookieVal = `fileDownloadToken=${token}; Path=/; SameSite=Lax`;
        if (Array.isArray(existing)) {
          res.setHeader('Set-Cookie', [...existing, cookieVal]);
        } else if (existing) {
          res.setHeader('Set-Cookie', [String(existing), cookieVal]);
        } else {
          res.setHeader('Set-Cookie', cookieVal);
        }
      }

      // We'll set Content-Type and filename after we see upstream headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Use fetch to get the video data and stream it
      const fetch = (await import('node-fetch')).default;
      
      console.log('Fetching video from actual URL...');
        // Choose proper referer/origin based on source URL to satisfy CDN checks
        const isTikTok = url.includes('tiktok.com');
        const isInstagram = url.includes('instagram.com');
        const isPinterest = url.includes('pinterest.com') || url.includes('pin.it');
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isFacebook = url.includes('facebook.com') || url.includes('fb.watch');
        const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');
        const referer = isTikTok
          ? 'https://www.tiktok.com/'
          : isInstagram
          ? 'https://www.instagram.com/'
          : isPinterest
          ? 'https://www.pinterest.com/'
          : isYouTube
          ? 'https://www.youtube.com/'
          : isFacebook
          ? 'https://www.facebook.com/'
          : isDailymotion
          ? 'https://www.dailymotion.com/'
          : undefined;
        const origin = referer ? referer.replace(/\/$/, '') : undefined;
        
        // Compatibility/transcoding is expensive and often unnecessary.
        // Default: do NOT force compatibility. Only honor explicit compatible=1/true.
        // EXCEPTION: For TikTok video downloads, enable compatibility by default (Windows players need H.264/AAC MP4).
        const requestedCompat = compatParam === '1' || compatParam === 'true';
        const disableCompat = compatParam === '0' || compatParam === 'false';
        let compatible = requestedCompat && !disableCompat;
        if (!disableCompat && isTikTok && format !== 'mp3') {
          compatible = true;
        }

        // Only use yt-dlp for conversion/remux when extracting audio (mp3) or when explicitly requested via compatible=1
        if (format === 'mp3' || compatible) {
          const platformName = isPinterest ? 'Pinterest' : isInstagram ? 'Instagram' : isTikTok ? 'TikTok' : isFacebook ? 'Facebook' : isYouTube ? 'YouTube' : 'Generic';
          console.log(`Using yt-dlp direct streaming for ${platformName}`);
          
          const filename = `${baseName}.${format === 'mp3' ? 'mp3' : 'mp4'}`;
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          if (token) {
            res.setHeader('Set-Cookie', `fileDownloadToken=${token}; Path=/; SameSite=Lax`);
          }

          // Prepare a temp output file to allow ffmpeg to merge/remux properly on Windows
          const tmpDir = os.tmpdir();
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const outExt = format === 'mp3' ? 'mp3' : 'mp4';
          const outPath = path.join(tmpDir, `vidfetch-${unique}.${outExt}`);

          // Use yt-dlp to write to temp file (spawn is imported at top for ESM)
          const args = [
            '--no-warnings', '--ignore-config', '--no-check-certificate', '--geo-bypass',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--socket-timeout', '60', '--extractor-retries', '5'
          ];

          // Platform-specific headers
          if (isInstagram) {
            args.push(
              '--add-header', 'Origin:https://www.instagram.com',
              '--add-header', 'Referer:https://www.instagram.com/',
              '--add-header', 'X-Instagram-AJAX:1',
              '--add-header', 'X-Requested-With:XMLHttpRequest'
            );
          } else if (isPinterest) {
            args.push(
              '--add-header', 'Origin:https://www.pinterest.com',
              '--add-header', 'Referer:https://www.pinterest.com/',
              '--add-header', 'X-Requested-With:XMLHttpRequest'
            );
          } else if (isTikTok) {
            args.push(
              '--add-header', 'Origin:https://www.tiktok.com',
              '--add-header', 'Referer:https://www.tiktok.com/'
            );
          }

          // Add cookies if available
          // Use a cookies file if explicitly provided.
          // Avoid --cookies-from-browser by default on Windows as it often fails when the browser is running.
          // To force using browser cookies, set ALLOW_COOKIES_FROM_BROWSER=1 and close the browser first.
          if (process.env.COOKIES_FILE) {
            args.push('--cookies', process.env.COOKIES_FILE);
          } else if (process.env.COOKIES_BROWSER && process.env.ALLOW_COOKIES_FROM_BROWSER === '1') {
            args.push('--cookies-from-browser', process.env.COOKIES_BROWSER);
          }

          // Format selection
          if (format === 'mp3') {
            args.push('--extract-audio', '--audio-format', 'mp3');
          } else {
            // Prefer H.264 (avc1) video + AAC (m4a) audio in MP4 for maximum compatibility (Windows players)
            // Use a robust selector; yt-dlp will fallback appropriately
            const compatSelector = "bestvideo[ext=mp4][vcodec~='^(avc1|h264)']+bestaudio[ext=m4a]/best[ext=mp4]/best";
            const heightSelector = quality.includes('1080')
              ? "bestvideo[height<=1080][ext=mp4][vcodec~='^(avc1|h264)']+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[ext=mp4]/best"
              : quality.includes('720')
              ? "bestvideo[height<=720][ext=mp4][vcodec~='^(avc1|h264)']+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[ext=mp4]/best"
              : compatSelector;
            args.push('-f', heightSelector);
            // Ensure MP4 container output when merging
            args.push('--merge-output-format', 'mp4');
          }

          // Output to temp file for reliable merging
          args.push('-o', outPath, url);

          // Honor FFMPEG_PATH if provided (needed for merge/remux)
          if (process.env.FFMPEG_PATH) {
            const ffLoc = process.env.FFMPEG_PATH.toLowerCase().endsWith('.exe')
              ? path.dirname(process.env.FFMPEG_PATH)
              : process.env.FFMPEG_PATH;
            args.push('--ffmpeg-location', ffLoc);
          }

          const ytdlpCmd = process.env.YTDLP_PATH || 'yt-dlp';
          console.log('Spawning yt-dlp for streaming:', ytdlpCmd, args.slice(0, -1).join(' '), '[URL]');
          
          const proc = spawn(ytdlpCmd, args);

          proc.stderr.on('data', (data: any) => {
            const output = data.toString();
            if (output.trim()) {
              console.log('[yt-dlp stderr]:', output.trim());
            }
          });

          proc.on('error', (error: any) => {
            console.error('yt-dlp process error:', error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to start video processing' });
            }
          });

          proc.on('close', (code: any) => {
            if (code !== 0) {
              console.error(`yt-dlp process exited with code ${code}`);
              if (!res.headersSent) {
                res.status(500).json({ error: `Video processing failed with code ${code}` });
              }
            } else {
              console.log('yt-dlp processing completed successfully, streaming file...');
              // Stream the temp file to client and then clean up
              try {
                const stat = fs.statSync(outPath);
                if (stat && stat.size) {
                  res.setHeader('Content-Length', String(stat.size));
                }
              } catch {}
              const read = fs.createReadStream(outPath);
              read.on('error', (e) => {
                console.error('Error reading output file:', e);
                if (!res.headersSent) {
                  res.status(500).json({ error: 'Failed to read processed file' });
                }
                try { fs.unlinkSync(outPath); } catch {}
              });
              read.on('close', () => {
                try { fs.unlinkSync(outPath); } catch {}
              });
              read.pipe(res);
            }
          });

          return;
        }

        // Default path: stream the actual file URL with proper headers (fast and reliable)
        const clientRange = req.headers.range;
        let videoResponse = await fetch(actualDownloadUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            ...(clientRange ? { 'Range': clientRange } : {}),
            ...(referer ? { 'Referer': referer } : {}),
            ...(origin ? { 'Origin': origin } : {}),
          }
        });

        // Fallback: some CDNs require Range to begin streaming. If no Range provided and body seems empty, retry with Range: bytes=0-
        const initialLen = videoResponse.headers.get('content-length');
        if (!clientRange && videoResponse.ok && (!initialLen || initialLen === '0')) {
          console.log('Upstream returned no content-length or 0 for full request, retrying with Range: bytes=0-');
          videoResponse = await fetch(actualDownloadUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'identity',
              'Connection': 'keep-alive',
              'Range': 'bytes=0-',
              ...(referer ? { 'Referer': referer } : {}),
              ...(origin ? { 'Origin': origin } : {}),
            }
          });
        }

        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
        }

        // Set headers
        const upstreamType = videoResponse.headers.get('content-type') || (format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Type', upstreamType);
        
        const urlPath = new URL(actualDownloadUrl).pathname;
        const pathExtMatch = urlPath.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
        const extFromPath = pathExtMatch ? pathExtMatch[1].toLowerCase() : undefined;
        const extFromType = upstreamType.includes('audio') ? 'mp3' : upstreamType.includes('mp4') ? 'mp4' : format;
        const finalExt = (extFromPath && extFromPath.length <= 5 ? extFromPath : extFromType) || format;
        const filename = `${baseName}.${finalExt}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const contentLength = videoResponse.headers.get('content-length');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }

        const range = req.headers.range;
        if (range) {
          res.setHeader('Accept-Ranges', 'bytes');
        }

        if (videoResponse.body) {
          videoResponse.body.pipe(res);
          videoResponse.body.on('end', () => {
            console.log('Video streaming completed successfully');
          });
          videoResponse.body.on('error', (error: any) => {
            console.error('Error during video streaming:', error);
          });
        } else {
          throw new Error('No video data received');
        }
      
    } catch (error: any) {
      console.error('Stream video error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: error.message || "Failed to stream video"
        });
      }
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
