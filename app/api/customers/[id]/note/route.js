import { NextResponse } from "next/server";
import { updateCustomerNote } from "@/lib/shopify";
import dbConnect from "@/lib/db";
import Customer from "@/app/models/Customer";
import User from "@/app/models/User";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { note } = await request.json();

    await dbConnect();
    const customer = await Customer.findOne({ shopifyId: id });
    
    // Get current user info from headers
    const currentUserRole = request.headers.get("x-user-role");
    const currentUserEmail = request.headers.get("x-user-email");
    
    const user = await User.findOne({ email: currentUserEmail });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // LOCKDOWN LOGIC:
    // If the customer already has an assigned agent (note is not empty)
    if (customer && customer.note && customer.note.trim() !== "") {
      // If the requester is a sales agent
      if (currentUserRole === "sales agent") {
        // They can only change the note if it's currently assigned to THEM
        if (customer.note !== user.name) {
          return NextResponse.json(
            { success: false, message: `This customer is already assigned to ${customer.note}. Only they or an admin can change this.` },
            { status: 403 }
          );
        }
      }
    }

    // Update in Shopify
    const updatedCustomer = await updateCustomerNote(id, note);

    // Update in MongoDB
    await Customer.findOneAndUpdate(
      { shopifyId: id },
      { $set: { note: note } }
    );

    return NextResponse.json({ 
      success: true, 
      customer: updatedCustomer 
    });
  } catch (error) {
    console.error("Error updating customer note:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update note" },
      { status: 500 }
    );
  }
}
