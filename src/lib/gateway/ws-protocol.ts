/** QQ 机器人网关 OpCode，见官方「事件订阅与通知」 */
export const Op = {
  Dispatch: 0,
  Heartbeat: 1,
  Identify: 2,
  Resume: 6,
  Reconnect: 7,
  InvalidSession: 9,
  Hello: 10,
  HeartbeatACK: 11,
} as const;

export type GatewayPayload = {
  id?: string;
  op: number;
  d?: unknown;
  s?: number | null;
  t?: string;
};

export type IdentifyPayload = {
  token?: string;
  intents?: number;
  shard?: [number, number];
  properties?: Record<string, unknown>;
};

export type ResumePayload = {
  token?: string;
  session_id?: string;
  seq?: number;
};

export type HelloPayload = {
  heartbeat_interval: number;
};
