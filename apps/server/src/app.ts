import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { auth, webOrigins } from "./auth";
import { gameRoutes } from "./routes/games";
import { groupRoutes } from "./routes/groups";

const api = new Hono().route("/", groupRoutes).route("/", gameRoutes);

export const app = new Hono()
  // One line per API request (method, path, status, duration) so 4xx responses show up in the server log too.
  .use("/api/*", logger())
  .use("/api/*", cors({ origin: webOrigins, credentials: true }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/api/health", (c) => c.json({ ok: true }))
  .route("/api", api)
  .onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "Serverfehler" }, 500);
  });

/** Typed API surface consumed by the app through `hono/client`. */
export type Api = typeof api;
