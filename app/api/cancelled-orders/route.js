import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CancelledOrder from "@/app/models/CancelledOrder";
import { fetchCancelledOrders } from "@/lib/shopify";
import { syncCancelledOrders } from "@/lib/sync";

export async function GET(request) {

  let useMongo = false;
  try {
    await dbConnect();
    useMongo = true;
  } catch (err) {
    console.warn("MongoDB not reachable for cancelled orders:", err.message);
  }

  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const search = searchParams.get("search") || "";
    const cancelReason = searchParams.get("cancelReason") || "all";
    const financialStatus = searchParams.get("financialStatus") || "all";
    const sync = searchParams.get("sync") === "true";

    if (useMongo) {
      if (sync) {
        syncCancelledOrders().catch(console.error);
        return NextResponse.json({ message: "Cancelled orders sync started" });
      }

      const count = await CancelledOrder.countDocuments({});
      if (count > 0) {
        const query = {};

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { "customer.displayName": { $regex: search, $options: "i" } },
            { "customer.email": { $regex: search, $options: "i" } },
            { "customer.phone": { $regex: search, $options: "i" } },
          ];
        }
        if (cancelReason !== "all") query.cancelReason = cancelReason.toUpperCase();
        if (financialStatus !== "all") query.displayFinancialStatus = financialStatus.toUpperCase();

        const limit = 50;
        const orders = await CancelledOrder.find(query)
          .sort({ cancelledAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        const total = await CancelledOrder.countDocuments(query);
        return NextResponse.json({
          orders,
          total,
          hasNextPage: total > skip + limit,
          nextSkip: skip + limit,
        });
      }

      // Trigger initial sync if empty
      syncCancelledOrdersInternal().catch(console.error);
    }

    // Fallback: live fetch from Shopify
    const { orders, hasNextPage, endCursor } = await fetchCancelledOrders();
    return NextResponse.json({ orders, hasNextPage, endCursor });
  } catch (error) {
    console.error("Cancelled Orders API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
