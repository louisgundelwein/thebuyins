/** Whether a ledger row is money put into the game or chips cashed out. Rebuys are extra `buy_in` rows. */
export type EntryKind = "buy_in" | "cash_out";

/** One ledger row for a game. `amountCents` is always an integer number of cents. */
export type Entry = { playerId: string; kind: EntryKind; amountCents: number };

/** A player's totals for a game. `netCents` is `cashOutCents - buyInCents`. */
export type PlayerResult = {
  playerId: string;
  buyInCents: number;
  cashOutCents: number;
  netCents: number;
};

/** A single payment that settles part of a debt: `from` pays `to`. */
export type Transfer = { from: string; to: string; amountCents: number };

/** Ledger totals. `differenceCents` is `cashedOutCents - potCents`; 0 means the chips balance. */
export type Summary = {
  players: PlayerResult[];
  potCents: number;
  cashedOutCents: number;
  differenceCents: number;
};

/**
 * Folds ledger rows into per-player results and game totals.
 * Players are returned sorted by net, largest winner first.
 */
export function summarize(entries: readonly Entry[]): Summary {
  const totals = new Map<string, { buyInCents: number; cashOutCents: number }>();

  for (const entry of entries) {
    const total = totals.get(entry.playerId) ?? { buyInCents: 0, cashOutCents: 0 };
    if (entry.kind === "buy_in") total.buyInCents += entry.amountCents;
    else total.cashOutCents += entry.amountCents;
    totals.set(entry.playerId, total);
  }

  const players = [...totals]
    .map(([playerId, { buyInCents, cashOutCents }]) => ({
      playerId,
      buyInCents,
      cashOutCents,
      netCents: cashOutCents - buyInCents,
    }))
    .sort((a, b) => b.netCents - a.netCents);

  const potCents = players.reduce((sum, p) => sum + p.buyInCents, 0);
  const cashedOutCents = players.reduce((sum, p) => sum + p.cashOutCents, 0);

  return { players, potCents, cashedOutCents, differenceCents: cashedOutCents - potCents };
}

/**
 * Removes an unexplained chip difference from the players' cash-outs.
 * The difference is split proportionally to each cash-out using largest remainder,
 * so the shares are exact integers that sum to `differenceCents`.
 * If nobody cashed out, the difference is split evenly. Nets sum to 0 afterwards.
 */
export function distributeDifference(
  players: readonly PlayerResult[],
  differenceCents: number,
): PlayerResult[] {
  if (differenceCents === 0) return players.map((p) => ({ ...p }));

  const totalCashOut = players.reduce((sum, p) => sum + p.cashOutCents, 0);
  const weightOf = (p: PlayerResult) => (totalCashOut > 0 ? p.cashOutCents : 1);
  const totalWeight = players.reduce((sum, p) => sum + weightOf(p), 0);
  if (totalWeight === 0) throw new Error("Cannot distribute a difference over no players");

  const absDiff = Math.abs(differenceCents);
  const sign = Math.sign(differenceCents);

  // Integer arithmetic only: `scaled % totalWeight` gives the exact fractional part.
  const rounded = players.map((player, index) => {
    const scaled = absDiff * weightOf(player);
    const remainder = scaled % totalWeight;
    return { player, index, base: (scaled - remainder) / totalWeight, remainder };
  });

  const leftover = absDiff - rounded.reduce((sum, r) => sum + r.base, 0);
  const bumped = new Set(
    [...rounded]
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
      .slice(0, leftover)
      .map((r) => r.index),
  );

  return rounded.map(({ player, index, base }) => {
    const share = sign * (base + (bumped.has(index) ? 1 : 0));
    return {
      ...player,
      cashOutCents: player.cashOutCents - share,
      netCents: player.netCents - share,
    };
  });
}

/**
 * Turns balanced nets into a short list of payments using a greedy match of the
 * largest debtor with the largest creditor. Produces at most `players.length - 1` transfers.
 * Throws if the nets do not sum to 0.
 */
export function settle(players: readonly PlayerResult[]): Transfer[] {
  const netTotal = players.reduce((sum, p) => sum + p.netCents, 0);
  if (netTotal !== 0) throw new Error(`Player nets must sum to 0, got ${netTotal}`);

  const debtors = players
    .filter((p) => p.netCents < 0)
    .map((p) => ({ playerId: p.playerId, amountCents: -p.netCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
  const creditors = players
    .filter((p) => p.netCents > 0)
    .map((p) => ({ playerId: p.playerId, amountCents: p.netCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;

  for (;;) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    if (!debtor || !creditor) break;

    const amountCents = Math.min(debtor.amountCents, creditor.amountCents);
    transfers.push({ from: debtor.playerId, to: creditor.playerId, amountCents });
    debtor.amountCents -= amountCents;
    creditor.amountCents -= amountCents;

    if (debtor.amountCents === 0) d++;
    if (creditor.amountCents === 0) c++;
  }

  return transfers;
}
