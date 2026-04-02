import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_key_change_in_production"
);

export async function middleware(request) {
  const authToken = request.cookies.get("auth_token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiLogin = request.nextUrl.pathname === "/api/login";
  const isSetupApi = request.nextUrl.pathname === "/api/setup";
  
  // Allow login page, API login, and setup route
  if (isLoginPage || isApiLogin || isSetupApi) {
    if (authToken) {
      try {
        await jwtVerify(authToken, JWT_SECRET);
        return NextResponse.redirect(new URL("/", request.url));
      } catch (err) {
        // Token invalid, allow them to stay on login page
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // Check authentication
  if (!authToken) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify and Check Authorization
  try {
    const { payload } = await jwtVerify(authToken, JWT_SECRET);
    
    // RBAC logic for Super Admin routes
    const isUsersRoute = request.nextUrl.pathname.startsWith("/users");
    const isApiUsersRoute = request.nextUrl.pathname.startsWith("/api/users");

    if ((isUsersRoute || isApiUsersRoute) && payload.role !== "super admin") {
      if (isApiUsersRoute) {
        return NextResponse.json({ success: false, message: "Forbidden: Super Admin only" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    // You could inject user role into headers if needed by server components down the line
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-email", payload.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Token is invalid/expired
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, message: "Unauthorized - Token Invalid" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
