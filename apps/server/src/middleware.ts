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

/** Returns the caller's membership in a group, or throws 404 so non-members can't probe ids. */
export async function membershipOf(userId: string, groupId: string) {
  const [row] = await db
    .select()
    .from(member)
    .where(and(eq(member.groupId, groupId), eq(member.userId, userId)));
  if (!row) throw new HTTPException(404, { message: "Gruppe nicht gefunden" });
  return row;
}
