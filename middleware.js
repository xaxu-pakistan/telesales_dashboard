import { NextResponse } from "next/server";

export function middleware(request) {
  const authToken = request.cookies.get("auth_token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiLogin = request.nextUrl.pathname === "/api/login";

  // Allow login page and API login route
  if (isLoginPage || isApiLogin) {
    if (authToken === "authenticated") {
      // If already authenticated, redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (authToken !== "authenticated") {
    // For API calls (except /api/login), return 401
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
