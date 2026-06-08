import { NextResponse } from "next/server";
import { getAuthProxyResponse } from "@/lib/gateway/auth-proxy";
import { jsonFromGatewayResult } from "@/lib/gateway/route-response";

/** 与 QQ 官方一致：POST /app/getAppAccessToken，appId 在 body */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await getAuthProxyResponse(rawBody);
  if ("json" in result && result.json === false) {
    return jsonFromGatewayResult(result);
  }
  return NextResponse.json(result.body, { status: result.status });
}
