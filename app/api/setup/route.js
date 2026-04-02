import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/app/models/User";

export async function GET(request) {
  try {
    await dbConnect();

    // Check if any super admin exists
    const superAdmin = await User.findOne({ role: "super admin" });
    if (superAdmin) {
      return NextResponse.json(
        { success: false, message: "Super admin already exists setup is deactivated." },
        { status: 403 }
      );
    }

    // Hash a default password
    const hashedPassword = await bcrypt.hash("AliBhatti@001", 10);

    // Create the super admin
    const newAdmin = await User.create({
      name: "Super Admin",
      email: "xaxupakistan@gmail.com",
      password: hashedPassword,
      role: "super admin",
      permissions: ["all"],
    });

    return NextResponse.json({
      success: true,
      message: "Initial Super Admin created successfully.",
      email: newAdmin.email,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred during setup." },
      { status: 500 }
    );
  }
}
