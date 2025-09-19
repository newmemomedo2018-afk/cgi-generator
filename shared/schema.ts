import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for JWT Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  credits: integer("credits").default(5).notNull(),
  isAdmin: boolean("is_admin").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CGI projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  productImageUrl: varchar("product_image_url").notNull(),
  sceneImageUrl: varchar("scene_image_url"), // Made nullable to support sceneVideoUrl
  sceneVideoUrl: varchar("scene_video_url"), // New: support video scene input
  contentType: varchar("content_type", { enum: ["image", "video"] }).notNull(),
  videoDurationSeconds: integer("video_duration_seconds").default(5), // New: 5 or 10 seconds
  status: varchar("status", { 
    enum: ["pending", "processing", "enhancing_prompt", "generating_image", "generating_video", "completed", "failed"] 
  }).default("pending"),
  progress: integer("progress").default(0),
  enhancedPrompt: text("enhanced_prompt"),
  outputImageUrl: varchar("output_image_url"),
  outputVideoUrl: varchar("output_video_url"),
  creditsUsed: integer("credits_used").notNull(),
  actualCost: integer("actual_cost").default(0).notNull(), // in millicents (1/1000 USD)
  resolution: varchar("resolution").default("1024x1024"),
  quality: varchar("quality").default("standard"),
  errorMessage: text("error_message"),
  // Kling AI task tracking for recovery
  klingVideoTaskId: varchar("kling_video_task_id"), // For video generation task
  klingSoundTaskId: varchar("kling_sound_task_id"), // For audio enhancement task
  includeAudio: boolean("include_audio").default(false), // Whether to add audio to video
  // Full task details from Kling AI for UI display (6-minute wait strategy)
  fullTaskDetails: jsonb("full_task_details"), // Complete Kling AI task response JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // in cents
  credits: integer("credits").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(), // UNIQUE constraint for idempotency
  status: varchar("status", { enum: ["pending", "completed", "failed"] }).default("pending"),
  processedAt: timestamp("processed_at"), // When webhook was processed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  description: true,
  productImageUrl: true,
  sceneImageUrl: true,
  sceneVideoUrl: true,
  contentType: true,
  videoDurationSeconds: true,
  resolution: true,
  quality: true,
}).refine((data) => {
  // Ensure either sceneImageUrl OR sceneVideoUrl is provided, but not both
  const hasImage = !!data.sceneImageUrl;
  const hasVideo = !!data.sceneVideoUrl;
  return hasImage !== hasVideo; // XOR: exactly one must be true
}, {
  message: "Provide either scene image or scene video, not both",
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  amount: true,
  credits: true,
  stripePaymentIntentId: true,
  status: true,
  processedAt: true,
});

// Job queue table for async processing (Vercel compatibility)
export const jobQueue = pgTable("job_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // 'cgi_generation'
  status: varchar("status", { 
    enum: ["pending", "processing", "completed", "failed"] 
  }).default("pending"),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  priority: integer("priority").notNull().default(0), // Higher = more priority
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  progress: integer("progress").notNull().default(0), // 0-100
  statusMessage: text("status_message"), 
  errorMessage: text("error_message"),
  data: jsonb("data"), // Job-specific data like contentType, paths, etc
  result: jsonb("result"), // Final result data
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobQueue).pick({
  type: true,
  projectId: true,
  userId: true,
  data: true,
  priority: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobQueue.$inferSelect;
