import { globalHub } from "./bot-runtime";

export type HealthResult =
  | { status: 403 }
  | { status: 200; body: { status: string; bots: number; clients: number } };

export function getHealthResponse(
  healthKeyHeader: string | null | undefined,
): HealthResult {
  const healthKey = process.env.HEALTH_KEY;
  if (healthKey) {
    if (healthKeyHeader !== healthKey) {
      return { status: 403 };
    }
  }
  const stats = globalHub.stats();
  return {
    status: 200,
    body: { status: "ok", bots: stats.bots, clients: stats.clients },
  };
}
