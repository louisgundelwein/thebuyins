import type { Entry } from "@thebuyins/core";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type QuickGame = {
  players: { id: string; name: string }[];
  buyInCents: number;
  entries: Entry[];
  phase: "live" | "cashout" | "complete";
};

const KEY = "quick-game";
// JSON is escaped to ASCII before splitting, keeping every chunk below 2 KB.
const CHUNK_SIZE = 400;
let pending: Promise<unknown> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validate(value: unknown): asserts value is QuickGame {
  if (!isRecord(value) || !Array.isArray(value.players) || !Array.isArray(value.entries) ||
      !Number.isSafeInteger(value.buyInCents) || (value.buyInCents as number) <= 0 ||
      (value.phase !== "live" && value.phase !== "cashout" && value.phase !== "complete")) {
    throw new Error("Invalid quick game");
  }
  const ids = new Set<string>();
  for (const player of value.players) {
    if (!isRecord(player) || typeof player.id !== "string" || !player.id ||
        typeof player.name !== "string" || !player.name.trim() || ids.has(player.id)) {
      throw new Error("Invalid quick game player");
    }
    ids.add(player.id);
  }
  if (ids.size === 0) throw new Error("Quick game has no players");
  for (const entry of value.entries) {
    if (!isRecord(entry) || typeof entry.playerId !== "string" || !ids.has(entry.playerId) ||
        (entry.kind !== "buy_in" && entry.kind !== "cash_out") ||
        !Number.isSafeInteger(entry.amountCents) || (entry.amountCents as number) < 0) {
      throw new Error("Invalid quick game entry");
    }
  }
}

/** Creates a ledger with one initial buy-in per player. */
export function createQuickGame(names: string[], buyInCents: number): QuickGame {
  const players = names.map((name, index) => ({ id: String(index), name: name.trim() }));
  const game: QuickGame = {
    players,
    buyInCents,
    entries: players.map(({ id }) => ({ playerId: id, kind: "buy_in", amountCents: buyInCents })),
    phase: "live",
  };
  validate(game);
  return game;
}

// Serialize reads and writes so a reader never sees a bank being reused.
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result;
  return result;
}

/** Loads the most recently saved game, or null when none exists. */
export function loadQuickGame(): Promise<QuickGame | null> {
  return serial(async () => {
    let json: string | null;
    if (Platform.OS === "web") {
      json = localStorage.getItem(KEY);
    } else {
      const manifest = await SecureStore.getItemAsync(KEY);
      if (manifest === null) return null;
      const match = /^(0|1):(\d+)$/.exec(manifest);
      if (!match || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) < 1) {
        throw new Error("Invalid quick game storage manifest");
      }
      const chunks: string[] = [];
      for (let i = 0; i < Number(match[2]); i++) {
        const chunk = await SecureStore.getItemAsync(`${KEY}-${match[1]}-${i}`);
        if (chunk === null) throw new Error("Missing quick game storage chunk");
        chunks.push(chunk);
      }
      json = chunks.join("");
    }
    if (json === null) return null;
    const game: unknown = JSON.parse(json);
    validate(game);
    return game;
  });
}

/** Atomically replaces the one saved game; storage errors are surfaced to the caller. */
export async function saveQuickGame(game: QuickGame): Promise<void> {
  validate(game);
  const json = JSON.stringify(game).replace(/[\u0080-\uffff]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  return serial(async () => {
    if (Platform.OS === "web") {
      localStorage.setItem(KEY, json);
      return;
    }
    const manifest = await SecureStore.getItemAsync(KEY);
    if (manifest !== null && !/^(0|1):[1-9]\d*$/.test(manifest)) {
      throw new Error("Invalid quick game storage manifest");
    }
    const bank = manifest?.startsWith("0:") ? 1 : 0;
    const count = Math.ceil(json.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${KEY}-${bank}-${i}`, json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(KEY, `${bank}:${count}`);
  });
}
