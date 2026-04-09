import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Return from "@/app/models/Return";
import { syncReturns } from "@/lib/sync";
import { fetchReturns } from "@/lib/shopify";

export async function GET(request) {
  let useMongo = false;
  try {
    await dbConnect();
    useMongo = true;
  } catch (err) {
    console.warn("MongoDB not reachable for returns:", err.message);
  }

  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const sync = searchParams.get("sync") === "true";

    if (useMongo) {
      if (sync) {
        syncReturns().catch(console.error);
        return NextResponse.json({ message: "Returns sync started" });
      }

      const count = await Return.countDocuments({});
      if (count > 0) {
        let query = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { "customer.firstName": { $regex: search, $options: "i" } },
            { "customer.lastName": { $regex: search, $options: "i" } },
            { "customer.email": { $regex: search, $options: "i" } },
          ];
        }
        if (status !== "all") query.status = status;

        const limit = 50;
        const returns = await Return.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        const total = await Return.countDocuments(query);
        return NextResponse.json({
          returns,
          total,
          hasNextPage: total > skip + limit,
          nextSkip: skip + limit,
        });
      }

      // Trigger initial sync if empty
      syncReturns().catch(console.error);
    }

    // Fallback to Shopify
    const { returns, hasNextPage, endCursor } = await fetchReturns();
    return NextResponse.json({
      returns,
      hasNextPage,
      endCursor,
    });

  } catch (error) {
    console.error("Returns API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
