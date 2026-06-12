import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { forwardedFromHeaders } from "@/lib/http-origin";
import { requireBotOwnership } from "@/lib/auth/session";
import { ensureBotAccessToken } from "@/lib/gateway/ensure-access-token";
import { resolveGatewayWsUrl } from "@/lib/gateway/gateway-url";

type Params = { params: Promise<{ appId: string }> };

/** Dashboard：一次返回 access_token + WebSocket gateway url（不暴露 clientSecret） */
export async function GET(_request: Request, { params }: Params) {
  const { appId } = await params;
  const owned = await requireBotOwnership(appId);
  if (!owned.ok) return owned.response;

  const tokens = await ensureBotAccessToken(appId);
  if (!tokens) {
    return NextResponse.json({ msg: "bot not found" }, { status: 404 });
  }

  const hdrs = await headers();
  const { host, proto } = forwardedFromHeaders(hdrs);
  const requestUrl = new URL(`${proto}://${host}`);

  const url = resolveGatewayWsUrl(
    appId,
    {
      GATEWAY_WS_URL: process.env.GATEWAY_WS_URL,
      PUBLIC_URL: process.env.PUBLIC_URL,
    },
    requestUrl,
  );

  return NextResponse.json({
    access_token: tokens.accessToken,
    expires_in: tokens.expiresIn,
    url,
  });
}
