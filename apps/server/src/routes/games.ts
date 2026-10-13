import { distributeDifference } from "@thebuyins/core";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db";
import { buyIn, game, member, seat } from "../db/schema/poker";
import { adminOf, membershipOf, requireUser, type AppEnv } from "../middleware";
import { loadGame } from "../stats";

/** Loads a game the caller may see. With `live`, also rejects edits to finished games. */
async function gameFor(userId: string, gameId: string, opts: { live?: boolean } = {}) {
  const state = await loadGame(gameId);
  if (!state) throw new HTTPException(404, { message: "Spiel nicht gefunden" });
  await membershipOf(userId, state.game.groupId);
  if (opts.live && state.game.status !== "live") throw new HTTPException(409, { message: "Spiel ist abgeschlossen" });
  return state;
}

function seatIn(state: Awaited<ReturnType<typeof gameFor>>, seatId: string) {
  const s = state.seats.find((x) => x.id === seatId);
  if (!s) throw new HTTPException(404, { message: "Spieler sitzt nicht am Tisch" });
  return s;
}

const gameParam = z.object({ gameId: z.uuid() });

// Every live-table mutation returns the fresh game state, so clients never refetch separately.
export const gameRoutes = new Hono<AppEnv>()
  .use(requireUser)

  .get("/games/:gameId", zValidator("param", gameParam), async (c) => {
    return c.json(await gameFor(c.var.user.id, c.req.valid("param").gameId));
  })

  /** Deletes a game with its seats and buy-ins, live or finished. Group admins only. */
  .delete("/games/:gameId", zValidator("param", gameParam), async (c) => {
    const state = await gameFor(c.var.user.id, c.req.valid("param").gameId);
    await adminOf(c.var.user.id, state.game.groupId);
    await db.delete(game).where(eq(game.id, state.game.id));
    return c.json({ ok: true });
  })

  /** Seats a group member who arrives late, in the next free position, with the standard buy-in. */
  .post(
    "/games/:gameId/seats",
    zValidator("param", gameParam),
    zValidator("json", z.object({ memberId: z.uuid() })),
    async (c) => {
      const { gameId } = c.req.valid("param");
      const state = await gameFor(c.var.user.id, gameId, { live: true });
      const { memberId } = c.req.valid("json");

      const m = await db.query.member.findFirst({ where: and(eq(member.id, memberId), eq(member.groupId, state.game.groupId)) });
      if (!m) throw new HTTPException(400, { message: "Unbekannter Spieler" });
      if (state.seats.some((s) => s.memberId === memberId)) throw new HTTPException(409, { message: "Sitzt schon am Tisch" });

      await db.transaction(async (tx) => {
        const position = Math.max(0, ...state.seats.map((x) => x.position)) + 1;
        const [s] = await tx.insert(seat).values({ gameId, memberId, position }).returning();
        if (!s) throw new Error("insert failed");
        await tx.insert(buyIn).values({ seatId: s.id, amountCents: state.game.buyInCents, createdBy: c.var.user.id });
      });
      return c.json(await gameFor(c.var.user.id, gameId));
    },
  )

  /** Rebuy. Defaults to the game's buy-in amount. */
  .post(
    "/games/:gameId/buy-ins",
    zValidator("param", gameParam),
    zValidator("json", z.object({ seatId: z.uuid(), amountCents: z.number().int().positive().optional() })),
    async (c) => {
      const { gameId } = c.req.valid("param");
      const state = await gameFor(c.var.user.id, gameId, { live: true });
      const body = c.req.valid("json");
      const s = seatIn(state, body.seatId);
      if (s.cashOutCents !== null) throw new HTTPException(409, { message: "Spieler ist schon ausgecasht" });

      await db.insert(buyIn).values({
        seatId: s.id,
        amountCents: body.amountCents ?? state.game.buyInCents,
        createdBy: c.var.user.id,
      });
      return c.json(await gameFor(c.var.user.id, gameId));
    },
  )

  /** Undo a mistaken buy-in. */
  .delete(
    "/games/:gameId/buy-ins/:buyInId",
    zValidator("param", gameParam.extend({ buyInId: z.uuid() })),
    async (c) => {
      const { gameId, buyInId } = c.req.valid("param");
      const state = await gameFor(c.var.user.id, gameId, { live: true });
      if (!state.buyIns.some((b) => b.id === buyInId)) throw new HTTPException(404);
      await db.delete(buyIn).where(eq(buyIn.id, buyInId));
      return c.json(await gameFor(c.var.user.id, gameId));
    },
  )

  /** Sets a player's final chip count. `null` puts them back in the game. */
  .put(
    "/games/:gameId/seats/:seatId/cash-out",
    zValidator("param", gameParam.extend({ seatId: z.uuid() })),
    zValidator("json", z.object({ cashOutCents: z.number().int().nonnegative().nullable() })),
    async (c) => {
      const { gameId, seatId } = c.req.valid("param");
      const state = await gameFor(c.var.user.id, gameId, { live: true });
      seatIn(state, seatId);
      await db.update(seat).set({ cashOutCents: c.req.valid("json").cashOutCents }).where(eq(seat.id, seatId));
      return c.json(await gameFor(c.var.user.id, gameId));
    },
  )

  /**
   * Closes the game once everyone cashed out. If the chips don't add up to the pot,
   * the caller must opt into spreading the difference proportionally over the cash-outs.
   */
  .post(
    "/games/:gameId/finish",
    zValidator("param", gameParam),
    zValidator("json", z.object({ distributeDifference: z.boolean().default(false) })),
    async (c) => {
      const { gameId } = c.req.valid("param");
      const state = await gameFor(c.var.user.id, gameId, { live: true });
      if (state.seats.some((s) => s.cashOutCents === null)) {
        throw new HTTPException(409, { message: "Noch nicht alle ausgecasht" });
      }

      const { players, differenceCents } = state.summary;
      if (differenceCents !== 0 && !c.req.valid("json").distributeDifference) {
        throw new HTTPException(409, { message: "Chips und Pot stimmen nicht überein" });
      }

      await db.transaction(async (tx) => {
        if (differenceCents !== 0) {
          for (const p of distributeDifference(players, differenceCents)) {
            await tx
              .update(seat)
              .set({ cashOutCents: p.cashOutCents })
              .where(and(eq(seat.gameId, gameId), eq(seat.memberId, p.playerId)));
          }
        }
        await tx.update(game).set({ status: "finished", finishedAt: new Date() }).where(eq(game.id, gameId));
      });
      return c.json(await gameFor(c.var.user.id, gameId));
    },
  );
