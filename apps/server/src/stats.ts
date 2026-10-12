import { settle, summarize, type Entry } from "@homegame/core";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { buyIn, game, member, seat } from "./db/schema/poker";

/** Builds the full table state of one game: seats, buy-in log, totals and suggested transfers. */
export async function loadGame(gameId: string) {
  const g = await db.query.game.findFirst({ where: eq(game.id, gameId) });
  if (!g) return null;

  const seats = await db
    .select({ id: seat.id, gameId: seat.gameId, memberId: seat.memberId, cashOutCents: seat.cashOutCents, name: member.displayName })
    .from(seat)
    .innerJoin(member, eq(member.id, seat.memberId))
    .where(eq(seat.gameId, gameId))
    .orderBy(member.displayName);
  const buyIns = seats.length
    ? await db
        .select()
        .from(buyIn)
        .where(inArray(buyIn.seatId, seats.map((s) => s.id)))
        .orderBy(buyIn.createdAt)
    : [];

  const summary = summarize(entriesOf(seats, buyIns));
  const allCashedOut = seats.length > 0 && seats.every((s) => s.cashOutCents !== null);
  const transfers = allCashedOut && summary.differenceCents === 0 ? settle(summary.players) : [];

  return { game: g, seats, buyIns, summary, transfers };
}

/** Per-member results over all finished games of a group, optionally limited to one year. */
export async function leaderboard(groupId: string, year?: number) {
  const games = await db
    .select({ id: game.id, startedAt: game.startedAt })
    .from(game)
    .where(and(eq(game.groupId, groupId), eq(game.status, "finished")));
  const inScope = games.filter((g) => !year || g.startedAt.getFullYear() === year);
  if (!inScope.length) return [];

  const seats = await db.select().from(seat).where(inArray(seat.gameId, inScope.map((g) => g.id)));
  const buyIns = await db.select().from(buyIn).where(inArray(buyIn.seatId, seats.map((s) => s.id)));

  const byMember = new Map<string, { games: number; wins: number; netCents: number; bestCents: number }>();
  for (const g of inScope) {
    const gameSeats = seats.filter((s) => s.gameId === g.id);
    const { players } = summarize(entriesOf(gameSeats, buyIns));
    for (const p of players) {
      const row = byMember.get(p.playerId) ?? { games: 0, wins: 0, netCents: 0, bestCents: 0 };
      row.games++;
      row.netCents += p.netCents;
      if (p.netCents > 0) row.wins++;
      row.bestCents = Math.max(row.bestCents, p.netCents);
      byMember.set(p.playerId, row);
    }
  }

  return [...byMember]
    .map(([memberId, row]) => ({ memberId, ...row }))
    .sort((a, b) => b.netCents - a.netCents);
}

/** Seats are keyed by member id so results can be aggregated across games. */
function entriesOf(
  seats: readonly (typeof seat.$inferSelect)[],
  buyIns: readonly (typeof buyIn.$inferSelect)[],
): Entry[] {
  const memberBySeat = new Map(seats.map((s) => [s.id, s.memberId]));
  return [
    ...buyIns.flatMap((b) => {
      const playerId = memberBySeat.get(b.seatId);
      return playerId ? [{ playerId, kind: "buy_in" as const, amountCents: b.amountCents }] : [];
    }),
    ...seats.map((s) => ({ playerId: s.memberId, kind: "cash_out" as const, amountCents: s.cashOutCents ?? 0 })),
  ];
}
