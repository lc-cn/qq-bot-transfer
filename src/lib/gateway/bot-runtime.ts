import type { WebSocket } from "ws";
import { deriveKeyPair } from "@/lib/crypto/ed25519";
import { decryptSecret } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { fetchAccessToken, TokenManager } from "./token-manager";

export type WebhookPayload = {
  op: number;
  id?: string;
  t?: string;
  d: unknown;
  /** 官方 Payload.s，下行事件序列号 */
  s?: number;
};

type Client = {
  id: string;
  conn: WebSocket;
};

export class BotRuntime {
  readonly appId: string;
  readonly botId: string;
  readonly secret: string;
  readonly privateKey: ReturnType<typeof deriveKeyPair>["privateKey"];
  readonly publicKey: Buffer;
  readonly tokenMgr: TokenManager;
  private clients = new Map<string, Client>();

  constructor(
    appId: string,
    botId: string,
    secret: string,
    keys: ReturnType<typeof deriveKeyPair>,
    tokenMgr: TokenManager,
  ) {
    this.appId = appId;
    this.botId = botId;
    this.secret = secret;
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
    this.tokenMgr = tokenMgr;
  }

  static create(
    appId: string,
    botId: string,
    secret: string,
    onToken?: (token: string) => void,
  ): BotRuntime {
    const keys = deriveKeyPair(secret);
    const tokenMgr = new TokenManager(appId, secret, onToken);
    return new BotRuntime(appId, botId, secret, keys, tokenMgr);
  }

  static async fromDb(appId: string): Promise<BotRuntime | null> {
    const bot = await prisma.bot.findUnique({ where: { appId } });
    if (!bot) return null;
    const secret = decryptSecret(bot.secretEnc);
    const runtime = BotRuntime.create(bot.appId, bot.id, secret, (token) => {
      globalHub.storeTokenMapping(bot.appId, token);
    });
    try {
      const { accessToken, expiresIn } = await fetchAccessToken(
        bot.appId,
        secret,
      );
      runtime.tokenMgr.setInitialToken(accessToken, expiresIn);
      globalHub.storeTokenMapping(bot.appId, accessToken);
    } catch (e) {
      console.error(`[store] bot=${appId} initial token fetch failed:`, e);
    }
    return runtime;
  }

  hasKeys(): boolean {
    return this.publicKey.length > 0;
  }

  addClient(conn: WebSocket): Client {
    const client = { id: generateId(), conn };
    this.clients.set(client.id, client);
    return client;
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  clientCount(): number {
    return this.clients.size;
  }

  broadcast(data: string): void {
    for (const client of this.clients.values()) {
      if (client.conn.readyState === client.conn.OPEN) {
        client.conn.send(data, (err) => {
          if (err) console.error(`[ws] bot=${this.appId} send failed:`, err);
        });
      }
    }
  }

  forwardEvent(payload: WebhookPayload): void {
    const msg: Record<string, unknown> = {
      op: payload.op,
      t: payload.t,
      d: payload.d,
    };
    if (payload.id) msg.id = payload.id;
    if (payload.s !== undefined) msg.s = payload.s;
    const token = this.tokenMgr.token();
    if (token) msg.access_token = token;
    this.broadcast(JSON.stringify(msg));
  }

  dispose(): void {
    this.tokenMgr.dispose();
  }
}

class BotHub {
  private runtimes = new Map<string, BotRuntime>();
  private tokenMap = new Map<string, string>();

  async getOrLoad(appId: string): Promise<BotRuntime | null> {
    const existing = this.runtimes.get(appId);
    if (existing) return existing;
    const loaded = await BotRuntime.fromDb(appId);
    if (loaded) this.runtimes.set(appId, loaded);
    return loaded;
  }

  get(appId: string): BotRuntime | undefined {
    return this.runtimes.get(appId);
  }

  setRuntime(appId: string, rt: BotRuntime): void {
    const old = this.runtimes.get(appId);
    if (old && old !== rt) old.dispose();
    this.runtimes.set(appId, rt);
  }

  async registerFromAuth(
    appId: string,
    botId: string,
    secret: string,
    accessToken: string,
    expiresIn: number,
  ): Promise<BotRuntime> {
    let rt = this.runtimes.get(appId);
    if (!rt) {
      rt = BotRuntime.create(appId, botId, secret, (t) =>
        this.storeTokenMapping(appId, t),
      );
      this.runtimes.set(appId, rt);
    }
    rt.tokenMgr.setInitialToken(accessToken, expiresIn);
    this.storeTokenMapping(appId, accessToken);
    return rt;
  }

  evict(appId: string): void {
    const rt = this.runtimes.get(appId);
    if (rt) {
      rt.dispose();
      this.runtimes.delete(appId);
    }
  }

  storeTokenMapping(appId: string, accessToken: string): void {
    this.tokenMap.set(accessToken, appId);
  }

  lookupAppId(accessToken: string): string | undefined {
    return this.tokenMap.get(accessToken);
  }

  stats(): { bots: number; clients: number } {
    let clients = 0;
    for (const rt of this.runtimes.values()) clients += rt.clientCount();
    return { bots: this.runtimes.size, clients };
  }
}

export const globalHub = new BotHub();
