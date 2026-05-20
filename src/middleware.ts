import { auth } from "@/auth";
import { originFromRequest } from "@/lib/auth/resolve-request-url";

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

/** QQ SDK / 开放平台回调，与 server 网关路径一致，无需 Dashboard 登录 */
const GATEWAY_PREFIXES = [
  "/webhook/",
  "/gateway/",
  "/gateway/bot/",
  "/websocket/",
  "/app/getAppAccessToken/",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (GATEWAY_PREFIXES.some((p) => pathname.startsWith(p))) {
    return true;
  }
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return;
  if (!req.auth?.user?.id) {
    const login = new URL("/login", originFromRequest(req));
    login.searchParams.set("callbackUrl", pathname);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: [
    "/((?!webhook|gateway|websocket|api/health|app/getAppAccessToken).*)",
  ],
};
