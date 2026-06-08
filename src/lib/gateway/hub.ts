import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { prisma } from "@/lib/db";
import { fetchAccessToken } from "./token-manager";
import { BotRuntime, globalHub } from "./bot-runtime";
import {
  Op,
  type GatewayPayload,
  type IdentifyPayload,
} from "./ws-protocol";

const defaultHeartbeatInterval = 30_000;

type WsClientState = {
  sessionId: string;
  lastSeq: number | null;
  shard: [number, number];
};

function sendJson(ws: import("ws").WebSocket, msg: GatewayPayload): void {
  ws.send(JSON.stringify(msg));
}

function sendInvalidSession(ws: import("ws").WebSocket, reason: string): void {
  sendJson(ws, { op: Op.InvalidSession, d: { reason } });
}

async function authenticateToken(
  token: string,
  pathAppId: string,
): Promise<BotRuntime> {
  const trimmed = token.trim();
  if (trimmed.startsWith("QQBot ")) {
    const accessToken = trimmed.slice("QQBot ".length).trim();
    if (!accessToken) throw new Error("empty access_token");
    const mapped = globalHub.lookupAppId(accessToken);
    if (!mapped) {
      throw new Error("unknown access_token, call /app/getAppAccessToken first");
    }
    if (mapped !== pathAppId) {
      throw new Error("access_token does not match websocket appId path");
    }
    const bot = await globalHub.getOrLoad(pathAppId);
    if (!bot) throw new Error("bot not loaded");
    return bot;
  }
  if (trimmed.startsWith("Bot ")) {
    const body = trimmed.slice("Bot ".length).trim();
    const dot = body.indexOf(".");
    if (dot < 0) throw new Error("invalid Bot token format");
    const tokenAppId = body.slice(0, dot);
    const secret = body.slice(dot + 1);
    if (!tokenAppId || !secret) throw new Error("app_id and secret cannot be empty");
    if (tokenAppId !== pathAppId) {
      throw new Error("Bot token app_id does not match websocket path");
    }
    const { accessToken, expiresIn } = await fetchAccessToken(pathAppId, secret);
    const dbBot = await prisma.bot.findUnique({ where: { appId: pathAppId } });
    if (!dbBot) throw new Error("bot not found");
    return globalHub.registerFromAuth(
      pathAppId,
      dbBot.id,
      secret,
      accessToken,
      expiresIn,
    );
  }
  throw new Error(
    "unsupported token format, expected 'QQBot {access_token}' or 'Bot {app_id}.{secret}'",
  );
}

export function attachWebSocketServer(
  server: import("node:http").Server,
  nextUpgradeHandler?: (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => void,
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const match = url.pathname.match(/^\/websocket\/([^/]+)\/?$/);
    if (match) {
      const appId = decodeURIComponent(match[1]);
      wss.handleUpgrade(req, socket as Duplex, head, (ws) => {
        void handleConnection(ws, appId);
      });
      return;
    }
    if (nextUpgradeHandler) {
      nextUpgradeHandler(req, socket as Duplex, head);
      return;
    }
    socket.destroy();
  });

  return wss;
}

async function handleConnection(
  ws: import("ws").WebSocket,
  appId: string,
): Promise<void> {
  sendJson(ws, {
    op: Op.Hello,
    d: { heartbeat_interval: defaultHeartbeatInterval },
  });

  const identifyPromise = new Promise<GatewayPayload>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("identify timeout")), 30_000);
    const onMessage = (data: import("ws").RawData) => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      try {
        resolve(JSON.parse(data.toString()) as GatewayPayload);
      } catch (e) {
        reject(e);
      }
    };
    ws.on("message", onMessage);
  });

  let firstMsg: GatewayPayload;
  try {
    firstMsg = await identifyPromise;
  } catch (e) {
    console.log(`[gateway] appId=${appId} handshake error:`, e);
    sendInvalidSession(ws, "identify timeout or invalid");
    ws.close();
    return;
  }

  if (firstMsg.op === Op.Resume) {
    sendInvalidSession(
      ws,
      "Resume (op=6) is not supported on webhook-forward gateway; use Identify (op=2)",
    );
    ws.close();
    return;
  }

  if (firstMsg.op !== Op.Identify) {
    sendInvalidSession(ws, "expected Identify (op=2)");
    ws.close();
    return;
  }

  const identify = (firstMsg.d ?? {}) as IdentifyPayload;
  let bot: BotRuntime;
  try {
    const loaded = await globalHub.getOrLoad(appId);
    if (!loaded) throw new Error("bot not registered");
    bot = await authenticateToken(identify.token ?? "", appId);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "auth failed";
    console.log(`[gateway] appId=${appId} auth failed:`, reason);
    sendInvalidSession(ws, reason);
    ws.close();
    return;
  }

  const shard: [number, number] =
    identify.shard?.length === 2
      ? [identify.shard[0], identify.shard[1]]
      : [0, 1];

  const sessionId = crypto.randomUUID();
  const client = bot.addClient(ws);
  const wsState: WsClientState = {
    sessionId,
    lastSeq: null,
    shard,
  };

  const dbBot = await prisma.bot.findUnique({
    where: { appId: bot.appId },
    select: { name: true, qq: true },
  });
  const username = dbBot?.name ?? bot.appId;
  const userId = dbBot?.qq || bot.appId;

  // READY：user.id ← Bot QQ；user.username ← Bot 名称
  sendJson(ws, {
    op: Op.Dispatch,
    t: "READY",
    s: 1,
    d: {
      version: 1,
      session_id: sessionId,
      app_id: bot.appId,
      shard,
      user: { id: userId, username },
    },
  });
  console.log(
    `[gateway] bot=${bot.appId} client=${client.id} session=${sessionId} shard=${shard.join(",")}`,
  );

  const heartbeatTimeout = defaultHeartbeatInterval * 2;
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

  const resetHeartbeat = () => {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => ws.close(), heartbeatTimeout);
  };
  resetHeartbeat();

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString()) as GatewayPayload;
      if (msg.op === Op.Heartbeat) {
        const seq = msg.d;
        if (typeof seq === "number") {
          wsState.lastSeq = seq;
        } else if (seq === null) {
          wsState.lastSeq = null;
        }
        sendJson(ws, { op: Op.HeartbeatACK });
        resetHeartbeat();
        return;
      }
      if (msg.op === Op.Resume) {
        sendInvalidSession(
          ws,
          "Resume (op=6) is not supported on webhook-forward gateway",
        );
        ws.close();
      }
    } catch {
      /* ignore */
    }
  });

  ws.on("close", () => {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    bot.removeClient(client.id);
  });
}
