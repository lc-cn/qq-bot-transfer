import { NextResponse } from "next/server";
import { ensureBotAccessToken } from "@/lib/gateway/ensure-access-token";
import { requireBotOwnership } from "@/lib/auth/session";

type Params = { params: Promise<{ appId: string }> };

/** 对应 POST /app/getAppAccessToken/:appId（Dashboard 代理，不暴露 clientSecret） */
export async function POST(_request: Request, { params }: Params) {
  const { appId } = await params;
  const result = await requireBotOwnership(appId);
  if (!result.ok) return result.response;

  const tokens = await ensureBotAccessToken(appId);
  if (!tokens) {
    return NextResponse.json({ msg: "bot not found" }, { status: 404 });
  }

  return NextResponse.json({
    access_token: tokens.accessToken,
    expires_in: tokens.expiresIn,
  });
}
