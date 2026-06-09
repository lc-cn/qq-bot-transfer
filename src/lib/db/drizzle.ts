import type { D1Database } from "@cloudflare/workers-types";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@drizzle/schema";

export type AppDatabase = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): AppDatabase {
  return drizzle(d1, { schema });
}

export { schema };
