export type WebhookPayload = {
  op: number;
  id?: string;
  t?: string;
  d: unknown;
  s?: number;
};

export type BotSigningMaterial = {
  botId: string;
  appId: string;
  publicKey: Uint8Array;
  privateKey: import("@/lib/crypto/ed25519").Ed25519PrivateKey;
};

export type WebhookResult =
  | { status: 404; body: { msg: string } }
  | { status: 400; body: { msg: string } }
  | { status: 500; body: { msg: string } }
  | { status: 200; body: { plain_token: string; signature: string } }
  | {
      status: 204;
      forward?: { payload: WebhookPayload; seq: number; eventForQueue: WebhookPayload };
    };

export type GatewayDispatch = Record<string, unknown> & {
  op: number;
  s: number;
  t?: string;
  d: unknown;
  id?: string;
};
