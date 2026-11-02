import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth-token";

function tokenFrom(request: NextRequest) {
  return (
    request.cookies.get("erp_token")?.value ??
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value
  );
}

function homeFor(actorType?: string) {
  if (actorType === "STUDENT") return "/student/dashboard";
  if (actorType === "GUARDIAN") return "/parent/dashboard";
  return "/staff/dashboard";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = tokenFrom(request);
  const principal = raw ? await verifyAuthToken(raw) : null;

  const protectedPath =
    pathname.startsWith("/staff") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/parent");
  if (protectedPath && !principal) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname.startsWith("/staff") && principal && principal.actorType !== "STAFF") {
    return NextResponse.redirect(new URL(homeFor(principal.actorType), request.url));
  }
  if (pathname === "/login" && principal) {
    return NextResponse.redirect(new URL(homeFor(principal.actorType), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/student/:path*", "/parent/:path*", "/login"],
};
