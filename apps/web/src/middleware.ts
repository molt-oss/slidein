/**
 * Next.js Middleware — セッション未認証時にログインページへリダイレクト
 *
 * NOTE: Edge Runtime では node:crypto が使えないため、
 * ここでは cookie の存在チェックのみ行う。
 * 完全な HMAC 検証は API proxy route (Node.js Runtime) で実施する。
 */
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パス: ログインページ、API auth、静的ファイル
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("slidein_session")?.value;
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image, favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
