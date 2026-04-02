import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/app/models/User";

export async function GET(request) {
  try {
    await dbConnect();
    // Fetch all users except the password field
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, email, password, role, permissions } = body;

    // Validate inputs
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already registered" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "member",
      permissions: permissions || [],
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        permissions: newUser.permissions,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create user" },
      { status: 500 }
    );
  }
}
