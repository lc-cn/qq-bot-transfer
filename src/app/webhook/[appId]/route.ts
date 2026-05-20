import { NextResponse } from "next/server";
import { processWebhook } from "@/lib/gateway/webhook";

type Params = { params: Promise<{ appId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { appId } = await params;
  const rawBody = await request.text();
  const result = await processWebhook(
    appId,
    rawBody,
    request.headers.get("x-signature-ed25519") ?? undefined,
    request.headers.get("x-signature-timestamp") ?? undefined,
  );

  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(result.body, { status: result.status });
}
