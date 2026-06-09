import { and, asc, count, eq, inArray, lt } from "drizzle-orm";
import { createDb } from "../src/lib/db/drizzle";
import { webhookEvents } from "@drizzle/schema";
import type { Env, EventQueueMessage } from "./env";

export async function persistWebhookEvent(
  env: Env,
  botId: string,
  payload: EventQueueMessage["payload"],
): Promise<void> {
  const db = createDb(env.DB);
  await db.insert(webhookEvents).values({
    botId,
    op: payload.op,
    eventType: payload.t ?? null,
    payload,
  });

  const maxPerBot = parseInt(env.WEBHOOK_EVENT_MAX_PER_BOT ?? "5000", 10);
  const retentionDays = parseInt(env.WEBHOOK_EVENT_RETENTION_DAYS ?? "30", 10);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  await db
    .delete(webhookEvents)
    .where(
      and(eq(webhookEvents.botId, botId), lt(webhookEvents.receivedAt, cutoff)),
    );

  const [{ total }] = await db
    .select({ total: count() })
    .from(webhookEvents)
    .where(eq(webhookEvents.botId, botId));

  if (total > maxPerBot) {
    const excess = total - maxPerBot;
    const oldest = await db
      .select({ id: webhookEvents.id })
      .from(webhookEvents)
      .where(eq(webhookEvents.botId, botId))
      .orderBy(asc(webhookEvents.receivedAt))
      .limit(excess);
    if (oldest.length > 0) {
      await db
        .delete(webhookEvents)
        .where(inArray(webhookEvents.id, oldest.map((r) => r.id)));
    }
  }
}

export async function handleEventQueueBatch(
  env: Env,
  messages: EventQueueMessage[],
): Promise<void> {
  for (const msg of messages) {
    await persistWebhookEvent(env, msg.botId, msg.payload);
  }
}
