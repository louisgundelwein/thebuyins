import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, exists, getTableColumns, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db";
import { buyIn, game, group, member, seat } from "../db/schema/poker";
import { adminOf, memberOf, membershipOf, requireUser, type AppEnv } from "../middleware";
import { archiveOf, finishedResults, historyOf, leaderboard } from "../stats";

const cents = z.number().int().positive();

// No 0/O/1/I so codes survive being read out loud at the table.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newInviteCode = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(6)), (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Takes a member out of the group without touching their results. If they were the last admin,
 * the oldest account member still in the group takes over.
 */
async function leaveGroup(tx: Tx, m: typeof member.$inferSelect) {
  await tx.update(member).set({ leftAt: new Date(), role: "member" }).where(eq(member.id, m.id));
  if (m.role !== "admin") return;
  const [successor] = await tx
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.groupId, m.groupId), isNull(member.leftAt), isNotNull(member.userId)))
    .orderBy(member.createdAt)
    .limit(1);
  if (successor) await tx.update(member).set({ role: "admin" }).where(eq(member.id, successor.id));
}

async function groupByCode(code: string) {
  const g = await db.query.group.findFirst({ where: eq(group.inviteCode, code.toUpperCase()) });
  if (!g) throw new HTTPException(404, { message: "Einladungscode unbekannt" });
  return g;
}

export const groupRoutes = new Hono<AppEnv>()
  .use(requireUser)

  /** Groups the caller belongs to. */
  .get("/groups", async (c) => {
    const rows = await db
      .select({ id: group.id, name: group.name, role: member.role })
      .from(member)
      .innerJoin(group, eq(group.id, member.groupId))
      .where(and(eq(member.userId, c.var.user.id), isNull(member.leftAt)))
      .orderBy(group.createdAt);
    return c.json(rows);
  })

  .post(
    "/groups",
    zValidator("json", z.object({ name: z.string().trim().min(1).max(60), defaultBuyInCents: cents })),
    async (c) => {
      const body = c.req.valid("json");
      const created = await db.transaction(async (tx) => {
        const [g] = await tx.insert(group).values({ ...body, inviteCode: newInviteCode() }).returning();
        if (!g) throw new Error("insert failed");
        await tx.insert(member).values({ groupId: g.id, userId: c.var.user.id, displayName: c.var.user.name, role: "admin" });
        return g;
      });
      return c.json(created, 201);
    },
  )

  /**
   * Group page: active members (`played` = has sat at a game), former members (kept for their
   * names in standings), games, standings (`season` is a year or "all") and the caller's game history.
   */
  .get(
    "/groups/:groupId",
    zValidator("query", z.object({ season: z.union([z.literal("all"), z.coerce.number().int()]).default("all") })),
    async (c) => {
      const { groupId } = c.req.param();
      const me = await membershipOf(c.var.user.id, groupId);
      const { season } = c.req.valid("query");

      const [g, allMembers, games, results] = await Promise.all([
        db.query.group.findFirst({ where: eq(group.id, groupId) }),
        db
          .select({
            ...getTableColumns(member),
            played: sql<boolean>`${exists(db.select({ id: seat.id }).from(seat).where(eq(seat.memberId, member.id)))}`,
          })
          .from(member)
          .where(eq(member.groupId, groupId))
          .orderBy(member.displayName),
        db.select().from(game).where(eq(game.groupId, groupId)).orderBy(desc(game.startedAt)),
        finishedResults(groupId, c.var.user.id),
      ]);
      if (!g) throw new HTTPException(404);
      const members = allMembers.filter((m) => !m.leftAt);
      const formerMembers = allMembers.filter((m) => m.leftAt);
      const standings = leaderboard(results, season === "all" ? undefined : season);
      return c.json({ group: g, me, members, formerMembers, games, standings, history: historyOf(results, me.id) });
    },
  )

  /** Adds a guest by name, for friends without an account. */
  .post(
    "/groups/:groupId/members",
    zValidator("json", z.object({ displayName: z.string().trim().min(1).max(40) })),
    async (c) => {
      const { groupId } = c.req.param();
      await membershipOf(c.var.user.id, groupId);
      const [m] = await db.insert(member).values({ groupId, displayName: c.req.valid("json").displayName }).returning();
      return c.json(m, 201);
    },
  )

  /**
   * Admin removes a member. Account members keep their results: they leave the group and see those
   * games in their archive. Guests who played can't be removed, since that would drop their results.
   * Admins can't remove themselves.
   */
  .delete(
    "/groups/:groupId/members/:memberId",
    zValidator("param", z.object({ groupId: z.uuid(), memberId: z.uuid() })),
    async (c) => {
      const { groupId, memberId } = c.req.valid("param");
      const me = await adminOf(c.var.user.id, groupId);
      if (me.id === memberId) throw new HTTPException(409, { message: "Du kannst dich nicht selbst entfernen" });

      const target = await db.query.member.findFirst({
        where: and(eq(member.id, memberId), eq(member.groupId, groupId), isNull(member.leftAt)),
      });
      if (!target) throw new HTTPException(404, { message: "Mitglied nicht gefunden" });

      if (target.userId) {
        await db.transaction((tx) => leaveGroup(tx, target));
      } else {
        const [played] = await db.select({ id: seat.id }).from(seat).where(eq(seat.memberId, memberId)).limit(1);
        if (played) throw new HTTPException(409, { message: "Gast hat schon gespielt" });
        await db.delete(member).where(eq(member.id, memberId));
      }
      return c.json({ ok: true });
    },
  )

  /** Leaves the group. Your games stay for everyone else and move to your archive. */
  .post("/groups/:groupId/leave", async (c) => {
    const me = await membershipOf(c.var.user.id, c.req.param("groupId"));
    await db.transaction((tx) => leaveGroup(tx, me));
    return c.json({ ok: true });
  })

  /** Games of groups you left that you played in, newest first. */
  .get("/archive", async (c) => c.json(await archiveOf(c.var.user.id)))

  /** Invite preview: group name and guests the caller could claim as themselves. */
  .get("/invites/:code", async (c) => {
    const g = await groupByCode(c.req.param("code"));
    const guests = await db
      .select({ id: member.id, displayName: member.displayName })
      .from(member)
      .where(and(eq(member.groupId, g.id), isNull(member.userId), isNull(member.leftAt)));
    return c.json({ group: { id: g.id, name: g.name }, guests });
  })

  /** Joins a group, optionally taking over an existing guest so their history carries over. */
  .post(
    "/invites/:code/join",
    zValidator("json", z.object({ claimMemberId: z.uuid().optional() })),
    async (c) => {
      const g = await groupByCode(c.req.param("code"));
      const { claimMemberId } = c.req.valid("json");
      const user = c.var.user;

      // Rejoining after leaving restores the same row, so history and member id carry over.
      const existing = await memberOf(user.id, g.id);
      if (existing) {
        if (existing.leftAt) await db.update(member).set({ leftAt: null }).where(eq(member.id, existing.id));
        return c.json({ groupId: g.id });
      }

      if (claimMemberId) {
        const claimed = await db
          .update(member)
          .set({ userId: user.id })
          .where(and(eq(member.id, claimMemberId), eq(member.groupId, g.id), isNull(member.userId), isNull(member.leftAt)))
          .returning();
        if (!claimed.length) throw new HTTPException(409, { message: "Gast wurde schon übernommen" });
      } else {
        await db.insert(member).values({ groupId: g.id, userId: user.id, displayName: user.name });
      }
      return c.json({ groupId: g.id });
    },
  )

  /** Starts a game. `memberIds` is the drawn seating order; everyone gets their first buy-in. */
  .post(
    "/groups/:groupId/games",
    zValidator(
      "json",
      z.object({ title: z.string().trim().min(1).max(60), buyInCents: cents, memberIds: z.array(z.uuid()).min(2) }),
    ),
    async (c) => {
      const { groupId } = c.req.param();
      await membershipOf(c.var.user.id, groupId);
      const { title, buyInCents, memberIds } = c.req.valid("json");
      const valid = await db
        .select({ id: member.id })
        .from(member)
        .where(and(eq(member.groupId, groupId), isNull(member.leftAt), inArray(member.id, memberIds)));
      if (valid.length !== new Set(memberIds).size) throw new HTTPException(400, { message: "Unbekannter Spieler" });

      const created = await db.transaction(async (tx) => {
        const [g] = await tx.insert(game).values({ groupId, title, buyInCents }).returning();
        if (!g) throw new Error("insert failed");
        const seats = await tx
          .insert(seat)
          .values(memberIds.map((memberId, i) => ({ gameId: g.id, memberId, position: i + 1 })))
          .returning();
        await tx.insert(buyIn).values(seats.map((s) => ({ seatId: s.id, amountCents: buyInCents, createdBy: c.var.user.id })));
        return g;
      });
      return c.json(created, 201);
    },
  );
