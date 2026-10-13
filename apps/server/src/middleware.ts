import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "./auth";
import { db } from "./db";
import { member } from "./db/schema/poker";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
export type AppEnv = { Variables: { user: Session["user"] } };

/** Rejects requests without a Better Auth session and exposes `c.var.user`. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HTTPException(401, { message: "Nicht eingeloggt" });
  c.set("user", session.user);
  await next();
});

/** The caller's member row in a group, including one they left. Undefined if they never joined. */
export async function memberOf(userId: string, groupId: string) {
  return db.query.member.findFirst({ where: and(eq(member.groupId, groupId), eq(member.userId, userId)) });
}

/** Returns the caller's active membership, or throws 404 so non-members and former members can't probe ids. */
export async function membershipOf(userId: string, groupId: string) {
  const row = await memberOf(userId, groupId);
  if (!row || row.leftAt) throw new HTTPException(404, { message: "Gruppe nicht gefunden" });
  return row;
}

/** Like `membershipOf`, but only group admins pass; other members get 403. */
export async function adminOf(userId: string, groupId: string) {
  const me = await membershipOf(userId, groupId);
  if (me.role !== "admin") throw new HTTPException(403, { message: "Nur Admins dürfen das" });
  return me;
}
