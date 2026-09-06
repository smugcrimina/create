import {
  pgTable, serial, varchar, text, timestamp, integer, boolean, pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["admin", "employee"]);
export const priorityEnum = pgEnum("priority_level", ["Düşük", "Normal", "Yüksek", "Acil"]);
export const paymentStatusEnum = pgEnum("payment_status", ["Ödenmedi", "Ödendi", "Beklemede"]);
export const jobStatusEnum = pgEnum("job_status", ["Bekliyor", "Devam Ediyor", "Tamamlandı"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  role: roleEnum("role").notNull().default("employee"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  assignedTo: integer("assigned_to").references(() => users.id),
  companyName: varchar("company_name", { length: 300 }).notNull(),
  deadlineDays: integer("deadline_days"),
  deadlineDate: varchar("deadline_date", { length: 50 }),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("Ödenmedi"),
  jobType: text("job_type").notNull(),
  technique: varchar("technique", { length: 500 }),
  priority: priorityEnum("priority").notNull().default("Normal"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  reminder: text("reminder"),
  reminderFiredAt: timestamp("reminder_fired_at"),
  status: jobStatusEnum("status").notNull().default("Bekliyor"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const jobCompletions = pgTable("job_completions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull(),
  completedBy: integer("completed_by").references(() => users.id).notNull(),
  techniques: text("techniques"),
  completionNote: text("completion_note"),
  imageUrl: text("image_url"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const deletedJobs = pgTable("deleted_jobs", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id"),
  companyName: varchar("company_name", { length: 300 }).notNull(),
  jobType: text("job_type").notNull(),
  technique: varchar("technique", { length: 500 }),
  priority: varchar("priority", { length: 50 }),
  paymentStatus: varchar("payment_status", { length: 50 }),
  assignedFullName: varchar("assigned_full_name", { length: 200 }),
  notes: text("notes"),
  reminder: text("reminder"),
  imageUrl: text("image_url"),
  completionsData: text("completions_data"),
  status: varchar("status", { length: 50 }),
  jobCreatedAt: timestamp("job_created_at"),
  deletedAt: timestamp("deleted_at").notNull().defaultNow(),
  deletedBy: integer("deleted_by").references(() => users.id),
});

export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  loginAt: timestamp("login_at").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 100 }),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 200 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
