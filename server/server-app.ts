import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createChatStream } from "./routers/ai";
import { analyzeImageWithAI } from "./routers/vision";
import { getDb } from "./queries/connection";
import { events } from "../db/schema";
import { desc, sql, eq } from "drizzle-orm";

/**
 * Create the Hono app with all routes registered.
 * Used by both boot.ts (local dev) and index.ts (Vercel).
 */
export function createServerApp() {
  const app = new Hono<{ Bindings: HttpBindings }>();

  app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

  // ===== Vision Analyze Endpoint (direct, not via tRPC) =====
  app.post("/api/vision/analyze", async (c) => {
    try {
      const body = await c.req.json();
      const { imageBase64 } = body;

      if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.length < 100) {
        return c.json({ error: "Invalid image data" }, 400);
      }

      console.log("[Vision] API Key from env:", env.moonshotApiKey ? `set (${env.moonshotApiKey.substring(0, 12)}...)` : "NOT SET");
      console.log("[Vision] Received image, base64 length:", imageBase64.length);

      const result = await analyzeImageWithAI(imageBase64);
      console.log("[Vision] Analysis done, chairmen:", result.chairmen.length, "speakers:", result.speakers.length);
      return c.json(result);
    } catch (err: any) {
      console.error("[Vision] Error:", err);
      return c.json({ error: err.message || "AI 识别失败" }, 500);
    }
  });

  // ===== Events Save — direct endpoint (bypasses tRPC batch for large images) =====
  app.post("/api/events/save", async (c) => {
    try {
      const body = await c.req.json();
      const eventList = body.events;

      if (!Array.isArray(eventList)) {
        return c.json({ error: "events must be an array" }, 400);
      }

      const db = getDb();
      const existingRows = await db.select().from(events);
      const existingMap = new Map(existingRows.map(e => [e.id.toString(), e]));

      let inserted = 0;
      let updated = 0;

      for (const e of eventList) {
        if (!e.title || !e.date || !e.tumorType) continue;

        let scheduleImage = e.scheduleImage || null;
        if (scheduleImage === '[IMAGE_IN_DB]' && e.id && existingMap.has(e.id.toString())) {
          scheduleImage = existingMap.get(e.id.toString())!.scheduleImage;
        }

        const rowData = {
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
          scheduleImage,
          extractedInfo: e.extractedInfo || null,
        };

        if (e.id && existingMap.has(e.id.toString())) {
          try {
            await db.update(events).set(rowData).where(eq(events.id, parseInt(e.id)));
            updated++;
          } catch (err: any) {
            console.error(`[events.save] UPDATE failed "${e.title}" (id=${e.id}):`, err.message);
          }
        } else {
          try {
            await db.insert(events).values([rowData as any]);
            inserted++;
          } catch (err: any) {
            console.error(`[events.save] INSERT failed "${e.title}":`, err.message);
          }
        }
      }

      console.log(`[events.save] Done: ${inserted} inserted, ${updated} updated`);
      return c.json({ count: inserted + updated, inserted, updated, total: eventList.length });
    } catch (err: any) {
      console.error("[events.save] Error:", err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ===== AI Chat SSE Endpoint =====
  app.post("/api/ai/chat", async (c) => {
    try {
      const body = await c.req.json();
      const { message } = body;

      if (!message || typeof message !== "string") {
        return c.json({ error: "Message is required" }, 400);
      }

      const db = getDb();
      const allEvents = await db
        .select()
        .from(events)
        .orderBy(desc(events.createdAt))
        .limit(500);

      const eventsJson = JSON.stringify(allEvents, null, 2);
      const stream = await createChatStream(message, eventsJson);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } catch (err: any) {
      console.error("AI chat error:", err);
      const errorStream = new ReadableStream({
        start(controller) {
          const data = `data: ${JSON.stringify({ error: err.message || "AI 服务暂时不可用" })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
  });

  // ===== tRPC Endpoint =====
  app.use("/api/trpc/*", async (c) => {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
    });
  });

  // 404 handler
  app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

  return app;
}
