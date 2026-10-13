import { index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const memberRole = pgEnum("member_role", ["admin", "member"]);
export const gameStatus = pgEnum("game_status", ["live", "finished"]);

/** A circle of friends that plays together, e.g. "Titanom". */
export const group = pgTable("group", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  inviteCode: text().notNull().unique(),
  defaultBuyInCents: integer().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

/**
 * A person in a group. `userId` is null for guests that were added by name;
 * a guest is claimed when that person signs up and joins the group.
 * `leftAt` is set when an account leaves or is removed: the row stays so their results still
 * add up, and joining again clears it.
 */
export const member = pgTable(
  "member",
  {
    id: uuid().primaryKey().defaultRandom(),
    groupId: uuid().notNull().references(() => group.id, { onDelete: "cascade" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    displayName: text().notNull(),
    role: memberRole().notNull().default("member"),
    createdAt: timestamp().notNull().defaultNow(),
    leftAt: timestamp(),
  },
  (t) => [uniqueIndex().on(t.groupId, t.userId), index().on(t.userId)],
);

/** One evening / table. */
export const game = pgTable(
  "game",
  {
    id: uuid().primaryKey().defaultRandom(),
    groupId: uuid().notNull().references(() => group.id, { onDelete: "cascade" }),
    title: text().notNull(),
    buyInCents: integer().notNull(),
    status: gameStatus().notNull().default("live"),
    startedAt: timestamp().notNull().defaultNow(),
    finishedAt: timestamp(),
  },
  (t) => [index().on(t.groupId)],
);

/**
 * A member sitting at a game. `position` is the drawn seat (1 = first dealer, then clockwise);
 * `cashOutCents` is their final chip count (null while still playing).
 */
export const seat = pgTable(
  "seat",
  {
    id: uuid().primaryKey().defaultRandom(),
    gameId: uuid().notNull().references(() => game.id, { onDelete: "cascade" }),
    memberId: uuid().notNull().references(() => member.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
    cashOutCents: integer(),
  },
  (t) => [uniqueIndex().on(t.gameId, t.memberId)],
);

/** Every buy-in or rebuy is its own row, so the table history is an append-only log. */
export const buyIn = pgTable(
  "buy_in",
  {
    id: uuid().primaryKey().defaultRandom(),
    seatId: uuid().notNull().references(() => seat.id, { onDelete: "cascade" }),
    amountCents: integer().notNull(),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (t) => [index().on(t.seatId)],
);

/** Finished games a user removed from their own history. Only that user stops seeing them. */
export const hiddenGame = pgTable(
  "hidden_game",
  {
    userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
    gameId: uuid().notNull().references(() => game.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId] })],
);
