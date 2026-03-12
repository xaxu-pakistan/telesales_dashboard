import { NextResponse } from "next/server";
import { fetchCustomers } from "@/lib/shopify";
import fs from "fs/promises";
import path from "path";
import { calculateFollowupDate, getFollowupStatus, formatFollowupDate } from "@/lib/followup";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || null;
    const search = searchParams.get("search") || "";
    const dateFrom = searchParams.get("dateFrom"); 
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status") || "all";

    const MANDATORY_CUTOFF = "2024-11-01";
    
    // Build Shopify Query String
    let queryParts = [];
    queryParts.push("orders_count:>=1");
    
    // Baseline filter
    if (dateFrom) {
       queryParts.push(`last_order_date:>=${dateFrom}`);
    } else {
       queryParts.push(`last_order_date:>=${MANDATORY_CUTOFF}`);
    }

    if (dateTo) {
       queryParts.push(`last_order_date:<=${dateTo}`);
    }

    if (search) {
       const sanitized = search.replace(/[:]/g, " ").trim(); 
       if (sanitized) {
         queryParts.push(`(first_name:*${sanitized}* OR last_name:*${sanitized}* OR email:*${sanitized}* OR phone:*${sanitized}*)`);
       }
    }

    const queryStr = queryParts.join(" AND ");
    
    const { customers, hasNextPage, endCursor } = await fetchCustomers({ 
      cursor, 
      queryStr 
    });

    const dbPath = path.join(process.cwd(), "data", "followups.json");
    let followupsDb = {};
    try {
      const dbContent = await fs.readFile(dbPath, "utf8");
      followupsDb = JSON.parse(dbContent);
    } catch (e) {
      // DB might not exist yet
    }

    const enriched = customers.map(c => {
      let rawFollowupDate = null;
      if (c.lastOrder) {
        rawFollowupDate = calculateFollowupDate(
          c.lastOrder.processedAt, 
          c.lastOrder.amount, 
          c.lastOrder.items
        );
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
        followupDate: displayFollowupDate, // Client displays this
        followupStatus
      };
    });

    // Local filtering by status (since status is derived)
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
