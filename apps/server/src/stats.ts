import { settle, summarize, type Entry } from "@thebuyins/core";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { buyIn, game, member, seat } from "./db/schema/poker";

/** Builds the full table state of one game: seats, buy-in log, totals and suggested transfers. */
export async function loadGame(gameId: string) {
  const g = await db.query.game.findFirst({ where: eq(game.id, gameId) });
  if (!g) return null;

  const seats = await db
    .select({
      id: seat.id,
      gameId: seat.gameId,
      memberId: seat.memberId,
      position: seat.position,
      cashOutCents: seat.cashOutCents,
      name: member.displayName,
      userId: member.userId,
    })
    .from(seat)
    .innerJoin(member, eq(member.id, seat.memberId))
    .where(eq(seat.gameId, gameId))
    .orderBy(seat.position);
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

/** Results of every finished game in a group, oldest first. Basis for standings and history. */
export async function finishedResults(groupId: string) {
  const games = await db
    .select({ id: game.id, title: game.title, startedAt: game.startedAt })
    .from(game)
    .where(and(eq(game.groupId, groupId), eq(game.status, "finished")))
    .orderBy(game.startedAt);
  if (!games.length) return [];

  const seats = await db.select().from(seat).where(inArray(seat.gameId, games.map((g) => g.id)));
  const buyIns = await db.select().from(buyIn).where(inArray(buyIn.seatId, seats.map((s) => s.id)));

  return games.map((g) => ({ ...g, players: summarize(entriesOf(seats.filter((s) => s.gameId === g.id), buyIns)).players }));
}

type Results = Awaited<ReturnType<typeof finishedResults>>;

/** Per-member totals, optionally limited to one year. */
export function leaderboard(results: Results, year?: number) {
  const byMember = new Map<string, { games: number; wins: number; netCents: number; bestCents: number }>();
  for (const g of results) {
    if (year && g.startedAt.getFullYear() !== year) continue;
    for (const p of g.players) {
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

/** One member's result per game they played, oldest first, with rank (1 = biggest winner). */
export function historyOf(results: Results, memberId: string) {
  return results.flatMap((g) => {
    const rank = g.players.findIndex((p) => p.playerId === memberId);
    const me = g.players[rank];
    return me
      ? [{ gameId: g.id, title: g.title, startedAt: g.startedAt, players: g.players.length, rank: rank + 1, buyInCents: me.buyInCents, netCents: me.netCents }]
      : [];
  });
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
