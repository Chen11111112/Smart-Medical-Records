import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();
  const isNextServerAction = req.headers.has("next-action");

  if (pathname === "/" && method === "POST" && !isNextServerAction) {
    const target = new URL("/api/external-session", req.url);
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};

