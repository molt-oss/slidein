/**
 * API Proxy Route Handler — サーバーサイドでWorker APIに転送
 * NEXT_PUBLIC_API_KEY を排除し、API_KEY をサーバーサイドのみで使用
 *
 * SECURITY: リクエストは ADMIN_PASSWORD ベースのセッショントークンで認証する。
 * ダッシュボードの /api/auth/login で発行されたトークンを cookie で検証。
 */
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const API_URL = process.env.API_URL ?? "http://localhost:8787";
const API_KEY = process.env.API_KEY ?? "";

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  // セッショントークン検証
  const sessionToken = request.cookies.get("slidein_session")?.value;
  if (!verifySessionToken(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const targetPath = `/api/${path.join("/")}`;
  const url = `${API_URL}${targetPath}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body) init.body = body;
  }

  try {
    const res = await fetch(url, init);
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Proxy error: ${message}` },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
