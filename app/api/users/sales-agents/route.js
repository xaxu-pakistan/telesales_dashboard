import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/app/models/User";

export async function GET(request) {
  try {
    await dbConnect();
    // Fetch only active sales agents
    const agents = await User.find({ 
      role: "sales agent",
      isActive: true 
    }).select("name email").sort({ name: 1 });

    return NextResponse.json({ success: true, agents });
  } catch (error) {
    console.error("Fetch sales agents error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch sales agents" },
      { status: 500 }
    );
  }
}
