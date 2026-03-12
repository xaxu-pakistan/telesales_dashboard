import { NextResponse } from "next/server";
import { updateCustomerNote } from "@/lib/shopify";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { note } = await request.json();

    const updatedCustomer = await updateCustomerNote(id, note);

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
