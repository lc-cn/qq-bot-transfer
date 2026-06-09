import type {
  D1Database,
  DurableObjectNamespace,
  Fetcher,
  Queue,
} from "@cloudflare/workers-types";

export type EventQueueMessage = {
  botId: string;
  payload: {
    op: number;
    t?: string;
    d: unknown;
    id?: string;
    s?: number;
  };
  receivedAt: string;
};

export type Env = {
  DB: D1Database;
  BOT_GATEWAY: DurableObjectNamespace;
  EVENT_QUEUE: Queue<EventQueueMessage>;
  ASSETS: Fetcher;
  PUBLIC_URL: string;
  GATEWAY_WS_URL: string;
  AUTH_SECRET: string;
  AUTH_URL: string;
  AUTH_GITHUB_ID: string;
  AUTH_GITHUB_SECRET: string;
  ENCRYPTION_KEY: string;
  WEBHOOK_EVENT_RETENTION_DAYS?: string;
  WEBHOOK_EVENT_MAX_PER_BOT?: string;
  HEALTH_KEY?: string;
};
