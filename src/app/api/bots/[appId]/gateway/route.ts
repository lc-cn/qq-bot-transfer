import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getGatewayApiResponse } from "@/lib/gateway/gateway-api";
import { ensureBotAccessToken } from "@/lib/gateway/ensure-access-token";
import { requireBotOwnership } from "@/lib/auth/session";

type Params = { params: Promise<{ appId: string }> };

/** Dashboard 代理 GET /gateway/:appId，响应体与 qq-bot 一致：{ url } */
export async function GET(request: Request, { params }: Params) {
  const { appId } = await params;
  const result = await requireBotOwnership(appId);
  if (!result.ok) return result.response;

  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (!auth) {
    return NextResponse.json(
      { msg: "missing Authorization header" },
      { status: 401 },
    );
  }

  const tokens = await ensureBotAccessToken(appId);
  if (!tokens) {
    return NextResponse.json({ msg: "bot not found" }, { status: 404 });
  }

  const hdrs = await headers();
  const gateway = getGatewayApiResponse(
    appId,
    auth,
    hdrs.get("x-union-appid"),
    hdrs,
  );
  return NextResponse.json(gateway.body, { status: gateway.status });
}
