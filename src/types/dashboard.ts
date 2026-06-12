/** Minimal Bot row for dashboard list/dialog */
export type BotRow = {
  id: string;
  name: string;
  qq: string;
  appId: string;
};

/** Webhook event row (matches API response shape) */
export type EventRow = {
  id: string;
  op: number | null;
  eventType: string | null;
  payload: unknown;
  receivedAt: string;
};
