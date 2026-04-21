import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/app/models/User";

export async function GET(request) {
  try {
    const email = request.headers.get("x-user-email");
    if (!email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email }).select("-password");

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Fetch me error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
