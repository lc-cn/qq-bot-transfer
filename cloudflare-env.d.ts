/* eslint-disable */
/// <reference types="@cloudflare/workers-types" />
// Bindings for OpenNext / Next.js (no worker module imports — see worker/env.ts for Worker code)
interface CloudflareEnv {
  DB: D1Database;
  EVENT_QUEUE: Queue;
  ASSETS: Fetcher;
  BOT_GATEWAY: DurableObjectNamespace;
  WORKER_SELF_REFERENCE?: Fetcher;
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
}

declare namespace Cloudflare {
  interface Env extends CloudflareEnv {}
}
