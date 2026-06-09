import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  githubId: text("githubId").notNull().unique(),
  email: text("email"),
  name: text("name"),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bots = sqliteTable("Bot", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  qq: text("qq").notNull(),
  appId: text("appId").notNull().unique(),
  secretEnc: text("secretEnc").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const webhookEvents = sqliteTable(
  "WebhookEvent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    botId: text("botId")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    op: integer("op"),
    eventType: text("eventType"),
    payload: text("payload", { mode: "json" }).notNull(),
    receivedAt: integer("receivedAt", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("WebhookEvent_botId_receivedAt_idx").on(
      table.botId,
      table.receivedAt,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
