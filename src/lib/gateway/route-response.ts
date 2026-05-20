import { NextResponse } from "next/server";

export function jsonFromGatewayResult(
  result:
    | { status: number; body: unknown; json?: true }
    | { status: number; body: string; json: false },
): NextResponse {
  if ("json" in result && result.json === false) {
    return new NextResponse(result.body, {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}
