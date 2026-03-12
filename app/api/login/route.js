import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const HARDCODED_EMAIL = "xaxupakistan@gmail.com";
    const HARDCODED_PASSWORD = "AliBhatti@001";

    if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
      const response = NextResponse.json({ success: true });

      // Set a session cookie
      response.cookies.set("auth_token", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: "Invalid email or password" },
      { status: 401 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 },
    );
  }
}
