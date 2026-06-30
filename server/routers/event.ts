import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { events } from "../../db/schema";
import { sql, desc } from "drizzle-orm";

export const eventRouter = createRouter({
  // List all events
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(events).orderBy(desc(events.createdAt));
  }),

  // Get events by month
  getByMonth: publicQuery
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const prefix = `${input.year}-${String(input.month).padStart(2, "0")}`;
      return db
        .select()
        .from(events)
        .where(sql`DATE_FORMAT(${events.date}, '%Y-%m') = ${prefix}`)
        .orderBy(events.date);
    }),

  // Create event
  create: publicQuery
    .input(
      z.object({
        title: z.string().min(1),
        date: z.string(),
        tumorType: z.string(),
        location: z.string().optional(),
        scale: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        speakers: z.array(z.string()).optional(),
        attendees: z.number().optional(),
        budget: z.number().optional(),
        onlineOffline: z.string().optional(),
        ta: z.string().optional(),
        expCategory: z.string().optional(),
        region: z.string().optional(),
        province: z.string().optional(),
        city: z.string().optional(),
        hospital: z.string().optional(),
        kol: z.string().optional(),
        links: z.array(z.object({ id: z.string(), label: z.string(), url: z.string() })).optional(),
        scheduleText: z.string().optional(),
        scheduleImage: z.string().optional(),
        extractedInfo: z.object({
          chairmen: z.array(z.string()),
          speakers: z.array(z.string()),
          topics: z.array(z.string()),
          links: z.array(z.object({ label: z.string(), url: z.string() })),
          qrCodes: z.array(z.string()),
          schedule: z.string(),
          notes: z.string(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(events).values({
        title: input.title,
        date: input.date,
        tumorType: input.tumorType,
        location: input.location || "待定",
        scale: input.scale || "中型",
        type: input.type || "其他",
        description: input.description || null,
        speakers: input.speakers || null,
        attendees: input.attendees || null,
        budget: input.budget || null,
        onlineOffline: input.onlineOffline || null,
        ta: input.ta || null,
        expCategory: input.expCategory || null,
        region: input.region || null,
        province: input.province || null,
        city: input.city || null,
        hospital: input.hospital || null,
        kol: input.kol || null,
        links: input.links || null,
        scheduleText: input.scheduleText || null,
        scheduleImage: input.scheduleImage || null,
        extractedInfo: input.extractedInfo || null,
      });
      return { id: Number(result[0].insertId) };
    }),

  // Bulk create events (for import)
  bulkCreate: publicQuery
    .input(
      z.array(
        z.object({
          title: z.string().min(1),
          date: z.string(),
          tumorType: z.string(),
          location: z.string().optional(),
          scale: z.string().optional(),
          type: z.string().optional(),
          description: z.string().optional(),
          speakers: z.array(z.string()).optional(),
          attendees: z.number().optional(),
          budget: z.number().optional(),
          onlineOffline: z.string().optional(),
          ta: z.string().optional(),
          expCategory: z.string().optional(),
          region: z.string().optional(),
          province: z.string().optional(),
          city: z.string().optional(),
          hospital: z.string().optional(),
          kol: z.string().optional(),
          links: z.array(z.object({ id: z.string(), label: z.string(), url: z.string() })).optional(),
          scheduleText: z.string().optional(),
          scheduleImage: z.string().optional(),
          extractedInfo: z.object({
            chairmen: z.array(z.string()),
            speakers: z.array(z.string()),
            topics: z.array(z.string()),
            links: z.array(z.object({ label: z.string(), url: z.string() })),
            qrCodes: z.array(z.string()),
            schedule: z.string(),
            notes: z.string(),
          }).optional(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const values = input.map((e) => ({
        title: e.title,
        date: e.date,
        tumorType: e.tumorType,
        location: e.location || "待定",
        scale: e.scale || "中型",
        type: e.type || "其他",
        description: e.description || null,
        speakers: e.speakers || null,
        attendees: e.attendees || null,
        budget: e.budget || null,
        onlineOffline: e.onlineOffline || null,
        ta: e.ta || null,
        expCategory: e.expCategory || null,
        region: e.region || null,
        province: e.province || null,
        city: e.city || null,
        hospital: e.hospital || null,
        kol: e.kol || null,
        links: e.links || null,
        scheduleText: e.scheduleText || null,
        scheduleImage: e.scheduleImage || null,
        extractedInfo: e.extractedInfo || null,
      }));
      // Clear all existing data first, then insert fresh data
      // to prevent duplication on repeated saves
      await db.delete(events);
      if (values.length > 0) {
        await db.insert(events).values(values);
      }
      return { count: values.length };
    }),

  // Delete all events
  deleteAll: publicQuery.mutation(async () => {
    const db = getDb();
    await db.delete(events);
    return { ok: true };
  }),

  // Delete events by month
  deleteByMonth: publicQuery
    .input(z.object({ year: z.number(), month: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const prefix = `${input.year}-${String(input.month).padStart(2, "0")}`;
      await db
        .delete(events)
        .where(sql`DATE_FORMAT(${events.date}, '%Y-%m') = ${prefix}`);
      return { ok: true };
    }),

  // Update schedule & extracted info for an event
  updateSchedule: publicQuery
    .input(z.object({
      id: z.number(),
      scheduleText: z.string().optional(),
      scheduleImage: z.string().optional(),
      extractedInfo: z.object({
        chairmen: z.array(z.string()),
        speakers: z.array(z.string()),
        topics: z.array(z.string()),
        links: z.array(z.object({ label: z.string(), url: z.string() })),
        qrCodes: z.array(z.string()),
        schedule: z.string(),
        notes: z.string(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(events)
        .set({
          scheduleText: input.scheduleText ?? null,
          scheduleImage: input.scheduleImage ?? null,
          extractedInfo: input.extractedInfo ?? null,
        })
        .where(sql`${events.id} = ${input.id}`);
      return { ok: true };
    }),
});
