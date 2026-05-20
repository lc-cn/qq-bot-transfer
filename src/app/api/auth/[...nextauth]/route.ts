import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { runAuthHandler } from "@/lib/auth/resolve-request-url";

export async function GET(req: NextRequest) {
  return runAuthHandler(req, handlers.GET);
}

export async function POST(req: NextRequest) {
  return runAuthHandler(req, handlers.POST);
}
