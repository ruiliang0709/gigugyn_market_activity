import {
  mysqlTable,
  serial,
  varchar,
  text,
  longtext,
  int,
  json,
  timestamp,
} from "drizzle-orm/mysql-core";

export const events = mysqlTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  tumorType: varchar("tumor_type", { length: 50 }).notNull(),
  location: varchar("location", { length: 255 }).notNull().default("待定"),
  scale: varchar("scale", { length: 20 }).notNull().default("中型"),
  type: varchar("type", { length: 100 }).notNull().default("其他"),
  description: text("description"),
  speakers: json("speakers").$type<string[]>(),
  attendees: int("attendees"),
  budget: int("budget"),
  onlineOffline: varchar("online_offline", { length: 20 }),
  ta: varchar("ta", { length: 20 }),
  expCategory: varchar("exp_category", { length: 100 }),
  region: varchar("region", { length: 50 }),
  province: varchar("province", { length: 50 }),
  city: varchar("city", { length: 50 }),
  hospital: varchar("hospital", { length: 255 }),
  kol: varchar("kol", { length: 255 }),
  links: json("links").$type<Array<{ id: string; label: string; url: string }>>(),
  // ---- AI Schedule Analysis ----
  scheduleText: text("schedule_text"), // Raw uploaded schedule text
  scheduleImage: longtext("schedule_image"), // Base64 of uploaded schedule image (LONGTEXT for large images up to 4GB)
  extractedInfo: json("extracted_info").$type<{
    chairmen: string[];
    speakers: string[];
    topics: string[];
    links: Array<{ label: string; url: string }>;
    qrCodes: string[];           // QR code descriptions
    schedule: string;
    notes: string;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
