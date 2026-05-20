import { NextResponse } from "next/server";
import { getAuthProxyResponse } from "@/lib/gateway/auth-proxy";
import { jsonFromGatewayResult } from "@/lib/gateway/route-response";

type Params = { params: Promise<{ appId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { appId } = await params;
  const rawBody = await request.text();
  const result = await getAuthProxyResponse(appId, rawBody);
  if ("json" in result && result.json === false) {
    return jsonFromGatewayResult(result);
  }
  return NextResponse.json(result.body, { status: result.status });
}
