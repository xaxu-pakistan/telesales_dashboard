import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/app/models/User";
import Customer from "@/app/models/Customer";

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

    // Prevent creating more super admins
    if (role === "super admin") {
      return NextResponse.json(
        { success: false, message: "Cannot create additional super admins" },
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

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, name, email, password, role, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Prevent changing other users to super admin
    if (role === "super admin" && user.role !== "super admin") {
      return NextResponse.json(
        { success: false, message: "Cannot promote user to super admin" },
        { status: 400 }
      );
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    // Update password if provided
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // UNASSIGN LOGIC:
    // If a sales agent is being deactivated, clear their assignments in MongoDB
    if (user.role === "sales agent" && isActive === false) {
      await Customer.updateMany(
        { note: user.name },
        { $set: { note: "" } }
      );
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting super admin
    if (user.role === "super admin") {
      return NextResponse.json(
        { success: false, message: "Cannot delete super admin account" },
        { status: 400 }
      );
    }

    // UNASSIGN LOGIC:
    // If a sales agent is being deleted, clear their assignments in MongoDB
    if (user.role === "sales agent") {
      await Customer.updateMany(
        { note: user.name },
        { $set: { note: "" } }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete user" },
      { status: 500 }
    );
  }
}
