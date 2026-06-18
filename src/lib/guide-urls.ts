/** 接入指引页用的端点 URL（基于当前访问域名） */
export function guideEndpoints(origin: string, appId = "YOUR_APP_ID") {
  const base = origin.replace(/\/$/, "");
  const host = new URL(base).host;
  const wsProto = base.startsWith("https") ? "wss" : "ws";
  return {
    origin: base,
    oauthCallback: `${base}/api/auth/callback/github`,
    webhook: `${base}/webhook/${appId}`,
    gateway: `${base}/gateway/${appId}`,
    gatewayBot: `${base}/gateway/bot/${appId}`,
    auth: `${base}/app/getAppAccessToken`,
    websocket: `${wsProto}://${host}/websocket/${appId}`,
    health: `${base}/api/health`,
  };
}

/** qq-official-bot 完整示例（接入本网关） */
export function qqOfficialBotExample(origin: string, appId = "YOUR_APP_ID") {
  const urls = guideEndpoints(origin, appId);
  return `import { Bot, ReceiverMode } from 'qq-official-bot'

const bot = new Bot({
  appid: process.env.QQ_BOT_APPID!,
  secret: process.env.QQ_BOT_SECRET!,
  mode: ReceiverMode.WEBSOCKET,
  intents: [
    'GROUP_AND_C2C_EVENT', // 群 @ 与私聊
    'GROUP_MEMBER',        // 群成员进退（按需）
  ],
  sandbox: false,
  logLevel: 'info',
  maxRetry: 10,
  // 指向本网关（须为完整 URL）
  accessTokenUrl: '${urls.auth}',
  gatewayUrl: '${urls.gatewayBot}',
})

bot.on('message', async (event) => {
  console.log('收到消息:', event.content)
})

bot.start()`;
}

/** qq-official-bot 推荐 .env 配置 */
export function qqOfficialBotEnvExample(origin: string, appId = "YOUR_APP_ID") {
  const urls = guideEndpoints(origin, appId);
  return `QQ_BOT_APPID=${appId}
QQ_BOT_SECRET=你的_QQ_开放平台_clientSecret
QQ_BOT_ACCESS_TOKEN_URL=${urls.auth}
QQ_BOT_GATEWAY_URL=${urls.gatewayBot}`;
}
