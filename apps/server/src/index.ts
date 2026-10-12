import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Hono } from "hono";
import { existsSync } from "node:fs";
import { app } from "./app";
import { db } from "./db";

// Production applies pending migrations on boot; local dev uses `pnpm db:push`.
if (process.env.NODE_ENV === "production") {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
}

// In production the same service also serves the exported Expo web build.
const webDir = process.env.WEB_DIST ?? "../app/dist";
const server = new Hono().route("/", app);
if (existsSync(webDir)) {
  server
    .use("*", serveStatic({ root: webDir }))
    // Client-side routes (e.g. /join?code=…) fall back to the SPA shell.
    .get("*", serveStatic({ path: `${webDir}/index.html` }));
}

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: server.fetch, port }, () => console.log(`Listening on http://localhost:${port}`));
