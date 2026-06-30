import type { HttpBindings } from "@hono/node-server";
import { createServerApp } from "./server-app";
import { env } from "./lib/env";

/**
 * Create Hono app with all routes.
 * In local dev: served by Vite dev server
 * In production: served by @hono/node-server
 */
const app = createServerApp();

export default app;

// Start production server (only in non-Vercel environments)
if (env.isProduction && !process.env.VERCEL) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
