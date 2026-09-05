import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSession(request: NextRequest) {
  const token = request.cookies.get("erp_token")?.value;
  const authjs =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;
  return Boolean(token || authjs);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath =
    pathname.startsWith("/staff") || pathname.startsWith("/student");
  if (protectedPath && !hasSession(request)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname === "/login" && hasSession(request)) {
    return NextResponse.redirect(new URL("/staff/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/student/:path*", "/login"],
};
