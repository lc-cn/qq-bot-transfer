export type HealthResult =
  | { status: 403 }
  | { status: 200; body: { status: string } };

export function getHealthResponse(
  healthKeyHeader: string | null | undefined,
): HealthResult {
  const healthKey = process.env.HEALTH_KEY;
  if (healthKey) {
    if (healthKeyHeader !== healthKey) {
      return { status: 403 };
    }
  }
  return {
    status: 200,
    body: { status: "ok" },
  };
}
