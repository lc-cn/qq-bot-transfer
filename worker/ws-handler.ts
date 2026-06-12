import { Op, type GatewayPayload } from "../src/lib/gateway/ws-protocol";

export type WsAttachment = {
  identified: boolean;
  sessionId?: string;
};

export function parseWsMessage(
  message: string | ArrayBuffer,
): GatewayPayload | null {
  try {
    return JSON.parse(
      typeof message === "string" ? message : new TextDecoder().decode(message),
    ) as GatewayPayload;
  } catch {
    return null;
  }
}

export function buildHelloPayload(heartbeatIntervalMs: number): string {
  return JSON.stringify({
    op: Op.Hello,
    d: { heartbeat_interval: heartbeatIntervalMs },
  });
}

export function buildReadyPayload(
  appId: string,
  shard: [number, number],
  sessionId: string,
  meta: { name?: string; qq?: string },
): string {
  const username = meta.name ?? appId;
  const userId = meta.qq || appId;
  return JSON.stringify({
    op: Op.Dispatch,
    t: "READY",
    s: 1,
    d: {
      version: 1,
      session_id: sessionId,
      app_id: appId,
      shard,
      user: { id: userId, username },
    },
  });
}

export function buildInvalidSessionPayload(reason: string): string {
  return JSON.stringify({
    op: Op.InvalidSession,
    d: { reason },
  });
}

export function buildHeartbeatAck(): string {
  return JSON.stringify({ op: Op.HeartbeatACK });
}
