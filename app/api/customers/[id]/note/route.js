import { NextResponse } from "next/server";
import { updateCustomerNote } from "@/lib/shopify";
import dbConnect from "@/lib/db";
import Customer from "@/app/models/Customer";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { note } = await request.json();

    // Update in Shopify
    const updatedCustomer = await updateCustomerNote(id, note);

    // Update in MongoDB
    await dbConnect();
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
