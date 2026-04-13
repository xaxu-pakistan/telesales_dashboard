import mongoose from "mongoose";

const ReturnSchema = new mongoose.Schema(
  {
    shopifyId: { type: String, required: true, unique: true },
    gid: { type: String, required: true },
    name: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["OPEN", "CLOSED", "CANCELLED"], 
      default: "OPEN" 
    },
    order: {
      shopifyId: String,
      gid: String,
      name: String,
      totalPrice: { type: Number, default: 0 },
      currencyCode: { type: String, default: "PKR" },
    },

    customer: {
      shopifyId: String,
      gid: String,
      firstName: String,
      lastName: String,
      email: String,
    },
    totalQuantity: { type: Number, default: 0 },
    returnLineItems: [
      {
        shopifyId: String,
        title: String,
        quantity: Number,
        variantTitle: String,
        returnReason: String,
        returnReasonNote: String,
      }
    ],
    returnCreatedAt: { type: Date },
    lastSyncAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexing
ReturnSchema.index({ name: "text", "customer.email": "text", "customer.firstName": "text", "customer.lastName": "text" });
ReturnSchema.index({ returnCreatedAt: -1 });
ReturnSchema.index({ status: 1 });

export default mongoose.models.Return || mongoose.model("Return", ReturnSchema);
