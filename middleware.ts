import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const subdomain = host.split(".")[0];
  const { pathname } = req.nextUrl;

  // finance.robyncg.com → /finance (unless already there)
  if (subdomain === "finance") {
    if (!pathname.startsWith("/finance") && !pathname.startsWith("/api")) {
      return NextResponse.rewrite(new URL(`/finance${pathname}`, req.url));
    }
  }

  // ops.robyncg.com → / (strip /finance prefix if someone lands there directly)
  if (subdomain === "ops") {
    if (pathname.startsWith("/finance")) {
      return NextResponse.rewrite(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|gif|webp|ico)).*)"],
};
