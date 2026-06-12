import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const healthKey = process.env.HEALTH_KEY;
  if (healthKey && request.headers.get("x-health-key") !== healthKey) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.json({ status: "ok" });
}
