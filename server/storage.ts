import { type DownloadHistory, type InsertDownloadHistory, type VideoInfo, type InsertVideoInfo } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Download History
  getDownloadHistory(): Promise<DownloadHistory[]>;
  addDownloadHistory(download: InsertDownloadHistory): Promise<DownloadHistory>;
  deleteDownloadHistory(id: string): Promise<void>;
  clearDownloadHistory(): Promise<void>;
  
  // Video Info Cache
  getVideoInfo(url: string): Promise<VideoInfo | undefined>;
  saveVideoInfo(videoInfo: InsertVideoInfo): Promise<VideoInfo>;
  
  // User management (existing)
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private downloadHistory: Map<string, DownloadHistory>;
  private videoInfoCache: Map<string, VideoInfo>;
  private users: Map<string, any>;

  constructor() {
    this.downloadHistory = new Map();
    this.videoInfoCache = new Map();
    this.users = new Map();
  }

  // Download History Methods
  async getDownloadHistory(): Promise<DownloadHistory[]> {
    return Array.from(this.downloadHistory.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async addDownloadHistory(download: InsertDownloadHistory): Promise<DownloadHistory> {
    const id = randomUUID();
    const historyItem: DownloadHistory = {
      ...download,
      id,
      createdAt: new Date(),
      duration: download.duration || null,
      thumbnail: download.thumbnail || null,
      fileSize: download.fileSize || null,
      downloadUrl: download.downloadUrl || null,
      status: download.status || "pending",
    };
    this.downloadHistory.set(id, historyItem);
    return historyItem;
  }

  async deleteDownloadHistory(id: string): Promise<void> {
    this.downloadHistory.delete(id);
  }

  async clearDownloadHistory(): Promise<void> {
    this.downloadHistory.clear();
  }

  // Video Info Cache Methods
  async getVideoInfo(url: string): Promise<VideoInfo | undefined> {
    return Array.from(this.videoInfoCache.values()).find(info => info.url === url);
  }

  async saveVideoInfo(videoInfo: InsertVideoInfo): Promise<VideoInfo> {
    const id = randomUUID();
    const info: VideoInfo = {
      ...videoInfo,
      id,
      extractedAt: new Date(),
      description: videoInfo.description || null,
      thumbnail: videoInfo.thumbnail || null,
      duration: videoInfo.duration || null,
      uploader: videoInfo.uploader || null,
      viewCount: videoInfo.viewCount || null,
    };
    this.videoInfoCache.set(videoInfo.url, info);
    return info;
  }

  // User Methods (existing)
  async getUser(id: string): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = randomUUID();
    const user: any = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
