/**
 * Vercel Serverless Function entry point.
 * Handles all /api/* requests by routing them to the Hono app.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerApp } from "./server-app";

const app = createServerApp();

// Helper: convert Node.js req to Web API Request
function nodeToWebRequest(req: VercelRequest): Request {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;

  // Handle body
  const method = req.method || "GET";
  let body: any;

  if (req.body && method !== "GET" && method !== "HEAD") {
    body = JSON.stringify(req.body);
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value[0] : value);
    }
  }

  return new Request(url, {
    method,
    headers,
    body,
  });
}

// Helper: send Web API Response to Node.js res
async function webToNodeResponse(webRes: Response, res: VercelResponse) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await webRes.arrayBuffer();
  res.end(Buffer.from(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const request = nodeToWebRequest(req);
    const response = await app.fetch(request);
    await webToNodeResponse(response, res);
  } catch (err: any) {
    console.error("[Vercel API] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
