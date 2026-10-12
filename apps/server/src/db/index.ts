import { drizzle } from "drizzle-orm/postgres-js";
import * as auth from "./schema/auth";
import * as poker from "./schema/poker";

export const schema = { ...auth, ...poker };
export const db = drizzle(process.env.DATABASE_URL ?? "", { schema, casing: "snake_case" });
export type Db = typeof db;
