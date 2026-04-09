import mongoose from "mongoose";

const CancelledOrderSchema = new mongoose.Schema(
  {
    shopifyId: { type: String, required: true, unique: true },
    gid: { type: String, required: true },
    name: { type: String, required: true },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    displayFinancialStatus: { type: String },
    totalPrice: { type: Number, default: 0 },
    currencyCode: { type: String, default: "PKR" },
    customer: {
      displayName: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    lineItems: [
      {
        title: { type: String },
        quantity: { type: Number },
        unitPrice: { type: Number },
      },
    ],
    lastSyncAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for fast querying
CancelledOrderSchema.index({ name: "text", "customer.email": "text", "customer.displayName": "text" });
CancelledOrderSchema.index({ cancelledAt: -1 });
CancelledOrderSchema.index({ cancelReason: 1 });
CancelledOrderSchema.index({ displayFinancialStatus: 1 });

export default mongoose.models.CancelledOrder ||
  mongoose.model("CancelledOrder", CancelledOrderSchema);
