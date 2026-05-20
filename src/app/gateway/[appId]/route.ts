import { NextResponse } from "next/server";
import { getGatewayApiResponse } from "@/lib/gateway/gateway-api";

type Params = { params: Promise<{ appId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { appId } = await params;
  const result = getGatewayApiResponse(
    appId,
    request.headers.get("authorization") ?? undefined,
    request.headers.get("x-union-appid"),
    request.headers,
  );
  return NextResponse.json(result.body, { status: result.status });
}
