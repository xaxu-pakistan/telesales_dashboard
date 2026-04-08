import { NextResponse } from "next/server";
import { fetchCustomers } from "@/lib/shopify";
import fs from "fs/promises";
import path from "path";
import { calculateFollowupDate, getFollowupStatus, formatFollowupDate } from "@/lib/followup";
import dbConnect from "@/lib/db";
import Customer from "@/app/models/Customer";
import { syncCustomers } from "@/lib/sync";

export async function GET(request) {
  let useMongo = false;
  try {
    // Attempt MongoDB connection with a short timeout to avoid hanging
    await Promise.race([
        dbConnect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 5000))
    ]);
    useMongo = true;
  } catch (dbErr) {
    console.warn("MongoDB not reachable, falling back to direct Shopify fetch:", dbErr.message);
  }

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || null;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const search = searchParams.get("search") || "";
    const dateFrom = searchParams.get("dateFrom"); 
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status") || "all";
    const sync = searchParams.get("sync") === "true";

    // If MongoDB is available, try to use it
    if (useMongo) {
        if (sync) {
            syncCustomers().catch(console.error);
            return NextResponse.json({ message: "Sync started in background" });
        }

        const count = await Customer.countDocuments({});
        if (count > 0) {
            // Build MongoDB Query
            let query = {};
            if (search) {
                const sanitized = search.replace(/[:]/g, " ").trim();
                if (sanitized) {
                    query.$or = [
                        { firstName: { $regex: sanitized, $options: "i" } },
                        { lastName: { $regex: sanitized, $options: "i" } },
                        { email: { $regex: sanitized, $options: "i" } },
                        { phone: { $regex: sanitized, $options: "i" } },
                    ];
                }
            }
            if (status !== "all") query.followupStatus = status;
            if (dateFrom || dateTo) {
                query["lastOrder.processedAt"] = {};
                if (dateFrom) query["lastOrder.processedAt"].$gte = new Date(dateFrom);
                if (dateTo) query["lastOrder.processedAt"].$lte = new Date(dateTo);
            }

            const limit = 100;
            const customers = await Customer.find(query)
                .sort({ "lastOrder.processedAt": -1 })
                .skip(skip || (cursor ? parseInt(cursor) : 0))
                .limit(limit)
                .lean();

            if (customers.length > 0) {
                const results = customers.map(c => ({
                    ...c,
                    id: c.shopifyId,
                    customerId: c.shopifyId,
                    adminUrl: `https://admin.shopify.com/store/${process.env.SHOPIFY_STORE.replace(".myshopify.com", "")}/customers/${c.shopifyId}`
                }));
                const total = await Customer.countDocuments(query);
                return NextResponse.json({
                    customers: results,
                    total,
                    hasNextPage: total > (skip || 0) + limit,
                    endCursor: ((skip || 0) + limit).toString()
                });
            }
        }
        
        // If DB is empty, trigger sync for next time
        syncCustomers().catch(console.error);
    }

    // FALLBACK TO DIRECT SHOPIFY FETCH (Existing Logic but optimized)
    const MANDATORY_CUTOFF = "2024-11-01";
    let queryParts = ["orders_count:>=1"];
    if (dateFrom) queryParts.push(`last_order_date:>=${dateFrom}`);
    else queryParts.push(`last_order_date:>=${MANDATORY_CUTOFF}`);
    if (dateTo) queryParts.push(`last_order_date:<=${dateTo}`);
    if (search) {
       const sanitized = search.replace(/[:]/g, " ").trim(); 
       if (sanitized) queryParts.push(`(first_name:*${sanitized}* OR last_name:*${sanitized}* OR email:*${sanitized}* OR phone:*${sanitized}*)`);
    }
    const queryStr = queryParts.join(" AND ");
    
    const dbPath = path.join(process.cwd(), "data", "followups.json");
    let followupsDb = {};
    try {
      const dbContent = await fs.readFile(dbPath, "utf8");
      followupsDb = JSON.parse(dbContent);
    } catch (e) {}

    const { customers, hasNextPage, endCursor } = await fetchCustomers({ 
      cursor: cursor && isNaN(cursor) ? cursor : null, 
      queryStr 
    });

    const enriched = (customers || []).map(c => {
      let rawFollowupDate = null;
      if (c.lastOrder) {
        rawFollowupDate = calculateFollowupDate(c.lastOrder.processedAt, c.lastOrder.amount, c.lastOrder.items);
      }
      const isDone = !!followupsDb[c.id];
      const followupStatus = getFollowupStatus(rawFollowupDate, isDone);
      const displayFollowupDate = formatFollowupDate(rawFollowupDate);
      const storeName = process.env.SHOPIFY_STORE.replace(".myshopify.com", "");
      const adminUrl = `https://admin.shopify.com/store/${storeName}/customers/${c.id}`;

      return {
        ...c,
        customerId: c.id, 
        adminUrl,
        followupDate: displayFollowupDate,
        followupStatus
      };
    });

    let filtered = enriched;
    if (status !== "all") {
      filtered = enriched.filter(c => c.followupStatus === status);
    }

    return NextResponse.json({
      customers: filtered,
      hasNextPage,
      endCursor
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message }, 
      { status: 500 }
    );
  }
}
