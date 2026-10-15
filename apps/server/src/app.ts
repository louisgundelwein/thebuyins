import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { sql } from "drizzle-orm";
import { auth, webOrigins } from "./auth";
import { db } from "./db";
import { gameRoutes } from "./routes/games";
import { groupRoutes } from "./routes/groups";
import { wellKnownRoutes } from "./well-known";

const api = new Hono()
  // Which build is live, and the oldest app major.minor still allowed (see isOutdated in core).
  // Shipped apps read this response, so never rename or remove its fields.
  // Set MIN_APP_VERSION (e.g. "1.1") only once that version is live in both stores.
  .get("/version", (c) =>
    c.json({ commit: process.env.COMMIT ?? "dev", minAppVersion: process.env.MIN_APP_VERSION || null }),
  )
  .route("/", groupRoutes)
  .route("/", gameRoutes);

export const app = new Hono()
  // One line per API request (method, path, status, duration) so 4xx responses show up in the server log too.
  .use("/api/*", logger())
  .use("/api/*", cors({ origin: webOrigins, credentials: true }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/api/health", async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true });
    } catch (err) {
      console.error(err);
      return c.json({ ok: false }, 503);
    }
  })
  .route("/api", api)
  // Universal Links / App Links verification. Mounted here so it precedes the SPA fallback in index.ts.
  .route("/", wellKnownRoutes)
  .onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "Serverfehler" }, 500);
  });

/** Typed API surface consumed by the app through `hono/client`. */
export type Api = typeof api;
