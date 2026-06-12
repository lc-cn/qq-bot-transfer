import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { decryptSecret } from "../src/lib/crypto/secrets";
import { createDb } from "../src/lib/db/drizzle";
import { bots } from "@drizzle/schema";
import {
  botSigningFromSecret,
  processWebhookPayload,
} from "../src/lib/gateway/core/webhook-process";
import { GatewaySeq, buildDispatch } from "../src/lib/gateway/core/gateway-seq";
import { resolveGatewayWsUrl } from "../src/lib/gateway/gateway-url";
import { fetchAccessToken } from "../src/lib/gateway/token-manager";
import {
  Op,
  type GatewayPayload,
  type IdentifyPayload,
  type ResumePayload,
} from "../src/lib/gateway/ws-protocol";
import type { BotSigningMaterial } from "../src/lib/gateway/core/types";
import type { Env, EventQueueMessage } from "./env";

const HELLO_MS = 30_000;
const AUTH_URL = "https://bots.qq.com/app/getAppAccessToken";
const UPSTREAM_GATEWAY_BOT = "https://api.sgroup.qq.com/gateway/bot";
const APP_ID_HEADER = "X-Bot-App-Id";

type WsAttachment = {
  identified: boolean;
  sessionId?: string;
};

function parseAppIdFromPath(pathname: string): string | null {
  const patterns = [
    /^\/webhook\/([^/]+)\/?$/,
    /^\/websocket\/([^/]+)\/?$/,
    /^\/gateway\/bot\/([^/]+)\/?$/,
    /^\/gateway\/([^/]+)\/?$/,
  ];
  for (const re of patterns) {
    const m = pathname.match(re);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

function resolveAppId(request: Request): string | null {
  const header = request.headers.get(APP_ID_HEADER);
  if (header) return header;
  return parseAppIdFromPath(new URL(request.url).pathname);
}

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export class BotGatewayDO extends DurableObject<Env> {
  private seq = new GatewaySeq();
  private accessTokens = new Set<string>();
  private signing: BotSigningMaterial | null = null;
  private botMeta: { name: string; qq: string } | null = null;
  private boundAppId: string | null = null;

  private async loadBot(appId: string): Promise<BotSigningMaterial | null> {
    this.boundAppId = appId;
    if (this.signing?.appId === appId) return this.signing;
    const db = createDb(this.env.DB);
    const [row] = await db
      .select()
      .from(bots)
      .where(eq(bots.appId, appId))
      .limit(1);
    if (!row) return null;
    const secret = decryptSecret(row.secretEnc, this.env.ENCRYPTION_KEY);
    this.signing = botSigningFromSecret(row.id, row.appId, secret);
    this.botMeta = { name: row.name, qq: row.qq };
    return this.signing;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_internal/register-token" && request.method === "POST") {
      const body = (await request.json()) as { accessToken?: string };
      if (body.accessToken) this.accessTokens.add(body.accessToken);
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/_internal/invalidate" && request.method === "POST") {
      this.signing = null;
      this.botMeta = null;
      this.accessTokens.clear();
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("Upgrade") === "websocket") {
      const appId = resolveAppId(request);
      if (!appId) return new Response("Not Found", { status: 404 });
      return this.handleWebSocketUpgrade(appId);
    }

    if (url.pathname === "/app/getAppAccessToken" && request.method === "POST") {
      return this.handleAuthProxy(request);
    }

    const appId = resolveAppId(request);
    if (!appId) return new Response("Not Found", { status: 404 });

    if (url.pathname.startsWith("/webhook/") && request.method === "POST") {
      return this.handleWebhook(request, appId);
    }
    if (url.pathname.startsWith("/gateway/bot/") && request.method === "GET") {
      return this.handleGatewayBot(request, appId);
    }
    if (url.pathname.startsWith("/gateway/") && request.method === "GET") {
      return this.handleGateway(request, appId);
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleWebhook(request: Request, appId: string): Promise<Response> {
    const bot = await this.loadBot(appId);
    if (!bot) {
      return jsonResponse({ msg: "bot not registered" }, 404);
    }

    const rawBody = await request.text();
    const sign = request.headers.get("x-signature-ed25519") ?? undefined;
    const timestamp = request.headers.get("x-signature-timestamp") ?? undefined;
    const clientCount = this.ctx.getWebSockets().length;

    const result = processWebhookPayload(
      bot,
      rawBody,
      sign,
      timestamp,
      this.seq,
      clientCount,
    );

    if (result.status === 204 && result.forward) {
      const dispatch = buildDispatch(result.forward.payload, result.forward.seq);
      this.broadcast(JSON.stringify(dispatch));
      await this.env.EVENT_QUEUE.send({
        botId: bot.botId,
        payload: result.forward.eventForQueue,
        receivedAt: new Date().toISOString(),
      } satisfies EventQueueMessage);
      return new Response(null, { status: 204 });
    }

    if (result.status === 200) {
      return jsonResponse(result.body, 200);
    }
    if (
      result.status === 404 ||
      result.status === 400 ||
      result.status === 500
    ) {
      return jsonResponse(result.body, result.status);
    }
    return new Response(null, { status: 204 });
  }

  private async handleAuthProxy(request: Request): Promise<Response> {
    let body: { appId?: string; clientSecret?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse({ msg: "invalid request body" }, 400);
    }
    const appId = body.appId;
    if (!appId) return jsonResponse({ msg: "appId required in request body" }, 400);

    this.boundAppId = appId;

    const db = createDb(this.env.DB);
    const [row] = await db
      .select()
      .from(bots)
      .where(eq(bots.appId, appId))
      .limit(1);

    let secret: string;
    if (body.clientSecret) {
      secret = body.clientSecret;
    } else {
      if (!row) return jsonResponse({ msg: "bot not found" }, 404);
      try {
        secret = decryptSecret(row.secretEnc, this.env.ENCRYPTION_KEY);
      } catch {
        return jsonResponse({ msg: "failed to decrypt bot secret" }, 500);
      }
    }

    const upstream = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, clientSecret: secret }),
    });
    const respBody = await upstream.text();
    if (!upstream.ok) {
      return new Response(respBody, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const authResp = JSON.parse(respBody) as { access_token?: string };
      if (authResp.access_token) this.accessTokens.add(authResp.access_token);
    } catch {
      return new Response(respBody, { status: 502 });
    }
    return new Response(respBody, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private handleGateway(request: Request, appId: string): Response {
    const auth = request.headers.get("Authorization")?.trim() ?? "";
    if (!auth) return jsonResponse({ msg: "missing Authorization header" }, 401);
    if (auth.startsWith("QQBot ")) {
      const token = auth.slice("QQBot ".length).trim();
      if (token) this.accessTokens.add(token);
    }
    const wsUrl = resolveGatewayWsUrl(appId, this.env, new URL(request.url));
    return jsonResponse({ url: wsUrl });
  }

  private async handleGatewayBot(
    request: Request,
    appId: string,
  ): Promise<Response> {
    const auth = request.headers.get("Authorization")?.trim() ?? "";
    if (!auth) return jsonResponse({ msg: "missing Authorization header" }, 401);
    if (auth.startsWith("QQBot ")) {
      const token = auth.slice("QQBot ".length).trim();
      if (token) this.accessTokens.add(token);
    }

    const upstream = await fetch(UPSTREAM_GATEWAY_BOT, {
      headers: { Authorization: auth },
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return jsonResponse({ msg: "invalid upstream gateway/bot response" }, 502);
    }
    body.url = resolveGatewayWsUrl(appId, this.env, new URL(request.url));
    return jsonResponse(body);
  }

  private async handleWebSocketUpgrade(appId: string): Promise<Response> {
    await this.loadBot(appId);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    this.seq.seed(1);
    server.send(
      JSON.stringify({
        op: Op.Hello,
        d: { heartbeat_interval: HELLO_MS },
      }),
    );
    server.serializeAttachment({ identified: false } satisfies WsAttachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as WsAttachment | null;

    let msg: GatewayPayload;
    try {
      msg = JSON.parse(
        typeof message === "string" ? message : new TextDecoder().decode(message),
      ) as GatewayPayload;
    } catch {
      return;
    }

    if (!attachment?.identified) {
      await this.handleIdentify(ws, msg);
      return;
    }

    if (msg.op === Op.Heartbeat) {
      ws.send(JSON.stringify({ op: Op.HeartbeatACK }));
      return;
    }
  }

  private async handleIdentify(ws: WebSocket, msg: GatewayPayload): Promise<void> {
    const isResume = msg.op === Op.Resume;
    if (msg.op !== Op.Identify && !isResume) {
      ws.send(
        JSON.stringify({
          op: Op.InvalidSession,
          d: { reason: "expected Identify (op=2) or Resume (op=6)" },
        }),
      );
      ws.close();
      return;
    }

    const pathAppId = this.boundAppId;
    if (!pathAppId) {
      ws.send(
        JSON.stringify({
          op: Op.InvalidSession,
          d: { reason: "bot not registered" },
        }),
      );
      ws.close();
      return;
    }

    const payload = (msg.d ?? {}) as IdentifyPayload & ResumePayload;
    try {
      await this.authenticateToken(payload.token ?? "", pathAppId);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "auth failed";
      ws.send(JSON.stringify({ op: Op.InvalidSession, d: { reason } }));
      ws.close();
      return;
    }

    const shard: [number, number] =
      payload.shard?.length === 2
        ? [payload.shard[0], payload.shard[1]]
        : [0, 1];
    const sessionId =
      isResume && payload.session_id ? payload.session_id : crypto.randomUUID();
    this.seq.seed(isResume && payload.seq != null ? payload.seq + 1 : 1);

    this.sendReady(ws, pathAppId, shard, sessionId);
  }

  private sendReady(
    ws: WebSocket,
    pathAppId: string,
    shard: [number, number],
    sessionId: string,
  ): void {
    const username = this.botMeta?.name ?? pathAppId;
    const userId = this.botMeta?.qq || pathAppId;

    ws.send(
      JSON.stringify({
        op: Op.Dispatch,
        t: "READY",
        s: 1,
        d: {
          version: 1,
          session_id: sessionId,
          app_id: pathAppId,
          shard,
          user: { id: userId, username },
        },
      }),
    );
    ws.serializeAttachment({
      identified: true,
      sessionId,
    } satisfies WsAttachment);
  }

  private async verifyAccessToken(accessToken: string): Promise<boolean> {
    const res = await fetch(UPSTREAM_GATEWAY_BOT, {
      headers: { Authorization: `QQBot ${accessToken}` },
    });
    return res.ok;
  }

  private async authenticateToken(token: string, pathAppId: string): Promise<void> {
    const trimmed = token.trim();
    if (trimmed.startsWith("QQBot ")) {
      const accessToken = trimmed.slice("QQBot ".length).trim();
      if (!accessToken) throw new Error("empty access_token");
      if (!this.accessTokens.has(accessToken)) {
        const ok = await this.verifyAccessToken(accessToken);
        if (!ok) throw new Error("invalid access_token");
        this.accessTokens.add(accessToken);
      }
      return;
    }
    if (trimmed.startsWith("Bot ")) {
      const body = trimmed.slice("Bot ".length).trim();
      const dot = body.indexOf(".");
      if (dot < 0) throw new Error("invalid Bot token format");
      const tokenAppId = body.slice(0, dot);
      const secret = body.slice(dot + 1);
      if (tokenAppId !== pathAppId) {
        throw new Error("Bot token app_id does not match websocket path");
      }
      const { accessToken } = await fetchAccessToken(pathAppId, secret);
      this.accessTokens.add(accessToken);
      return;
    }
    throw new Error(
      "unsupported token format, expected 'QQBot {access_token}' or 'Bot {app_id}.{secret}'",
    );
  }

  private broadcast(data: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch (e) {
        console.error("[ws] broadcast failed:", e);
      }
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    ws.close();
  }
}
