import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, type AppDatabase } from "./drizzle";

export type { User, Bot, WebhookEvent } from "@drizzle/schema";

export async function getDb(): Promise<AppDatabase> {
  const { env } = await getCloudflareContext({ async: true });
  return createDb(env.DB);
}
