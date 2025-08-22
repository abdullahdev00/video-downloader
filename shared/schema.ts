import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const downloadHistory = pgTable("download_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail"),
  duration: text("duration"),
  quality: varchar("quality", { length: 20 }).notNull(),
  format: varchar("format", { length: 10 }).notNull(),
  fileSize: text("file_size"),
  downloadUrl: text("download_url"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videoInfo = pgTable("video_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull().unique(),
  platform: varchar("platform", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  duration: text("duration"),
  uploader: text("uploader"),
  viewCount: integer("view_count"),
  availableQualities: jsonb("available_qualities").notNull(),
  extractedAt: timestamp("extracted_at").defaultNow(),
});

export const insertDownloadHistorySchema = createInsertSchema(downloadHistory).omit({
  id: true,
  createdAt: true,
});

export const insertVideoInfoSchema = createInsertSchema(videoInfo).omit({
  id: true,
  extractedAt: true,
});

export const urlValidationSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export const downloadRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  quality: z.string().min(1, "Please select a quality"),
  format: z.enum(["mp4", "mp3"], {
    errorMap: () => ({ message: "Please select a valid format" })
  }),
});

export type InsertDownloadHistory = z.infer<typeof insertDownloadHistorySchema>;
export type DownloadHistory = typeof downloadHistory.$inferSelect;
export type InsertVideoInfo = z.infer<typeof insertVideoInfoSchema>;
export type VideoInfo = typeof videoInfo.$inferSelect;
export type UrlValidation = z.infer<typeof urlValidationSchema>;
export type DownloadRequest = z.infer<typeof downloadRequestSchema>;

export interface QualityOption {
  quality: string;
  format: string;
  fileSize: string;
  url?: string;
}

export interface ExtractedVideoInfo {
  title: string;
  description?: string;
  thumbnail: string;
  duration: string;
  uploader: string;
  viewCount?: number;
  availableQualities: QualityOption[];
  platform: string;
}
