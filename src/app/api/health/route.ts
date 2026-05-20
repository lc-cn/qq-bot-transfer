import { NextResponse } from "next/server";
import { getHealthResponse } from "@/lib/gateway/health";

export async function GET(request: Request) {
  const result = getHealthResponse(request.headers.get("x-health-key"));
  if (result.status === 403) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.json(result.body);
}
