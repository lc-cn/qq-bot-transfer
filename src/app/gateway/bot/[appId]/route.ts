import { NextResponse } from "next/server";
import { getGatewayBotApiResponse } from "@/lib/gateway/gateway-bot-api";
import { jsonFromGatewayResult } from "@/lib/gateway/route-response";

type Params = { params: Promise<{ appId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { appId } = await params;
  const result = await getGatewayBotApiResponse(
    appId,
    request.headers.get("authorization") ?? undefined,
    request.headers.get("x-union-appid"),
    request.headers,
  );

  if ("json" in result && result.json === false) {
    return jsonFromGatewayResult(result);
  }
  if ("json" in result && result.json === true) {
    return NextResponse.json(result.body, { status: result.status });
  }
  return jsonFromGatewayResult({
    status: result.status,
    body: result.body,
  });
}
