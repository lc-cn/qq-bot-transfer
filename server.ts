import "dotenv/config";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { ensureForwardedHeaders } from "./src/lib/http-origin";
import { attachWebSocketServer } from "./src/lib/gateway/hub";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const publicOrigin = new URL(
  process.env.PUBLIC_URL ?? process.env.AUTH_URL ?? `http://localhost:${port}`,
);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      ensureForwardedHeaders(req, publicOrigin);
      const parsed = parse(req.url ?? "/", true);
      await handle(req, res, parsed);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  attachWebSocketServer(server, app.getUpgradeHandler());

  server.listen(port, hostname, () => {
    console.log("╔════════════════════════════════════════════╗");
    console.log("║   QQ Bot Webhook → WebSocket Gateway       ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log(`Listening on http://${hostname}:${port}`);
    console.log("  WS   /websocket/:appId            (custom server)");
  });
});
