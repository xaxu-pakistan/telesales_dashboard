import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    shopifyId: { type: String, required: true, unique: true },
    gid: { type: String, required: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    tags: [String],
    note: { type: String, default: "" },
    numberOfOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrder: {
      name: String,
      processedAt: Date,
      amount: Number,
      currencyCode: String,
      items: [
        {
          title: String,
          variantTitle: String,
          quantity: Number,
        },
      ],
      trackingNumbers: [String],
      trackingCompany: String,
    },
    followupDate: String,
    followupStatus: String,
    lastSyncAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexing for faster search
CustomerSchema.index({ firstName: "text", lastName: "text", email: "text", phone: "text" });
CustomerSchema.index({ "lastOrder.processedAt": -1 });
CustomerSchema.index({ followupStatus: 1 });

export default mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
