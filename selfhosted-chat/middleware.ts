import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/api/health" || path.startsWith("/_next/") || path === "/favicon.ico") {
    return NextResponse.next();
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return new NextResponse("Server setup incomplete: APP_PASSWORD must be configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const authorization = request.headers.get("authorization") || "";
  const [scheme, encoded] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="OpenUI Self-hosted Chat", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }

  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return new NextResponse("Authentication required.", { status: 401 });
  }
  const separator = decoded.indexOf(":");
  const password = separator >= 0 ? decoded.slice(separator + 1) : "";
  if (!timingSafeEqual(password, expected)) {
    return new NextResponse("Authentication failed.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="OpenUI Self-hosted Chat", charset="UTF-8"' },
    });
  }

  return NextResponse.next();
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
