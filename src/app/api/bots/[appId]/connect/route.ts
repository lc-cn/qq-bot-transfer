import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireBotOwnership } from "@/lib/auth/session";
import { ensureBotAccessToken } from "@/lib/gateway/ensure-access-token";
import { getGatewayApiResponse } from "@/lib/gateway/gateway-api";

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
  const gateway = getGatewayApiResponse(
    appId,
    `QQBot ${tokens.accessToken}`,
    hdrs.get("x-union-appid"),
    hdrs,
  );
  if (gateway.status !== 200) {
    return NextResponse.json(gateway.body, { status: gateway.status });
  }

  return NextResponse.json({
    access_token: tokens.accessToken,
    expires_in: tokens.expiresIn,
    url: gateway.body.url,
  });
}
