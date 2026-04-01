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
    
    // Load followups DB first to avoid ReferenceError in loop
    const dbPath = path.join(process.cwd(), "data", "followups.json");
    let followupsDb = {};
    try {
      const dbContent = await fs.readFile(dbPath, "utf8");
      followupsDb = JSON.parse(dbContent);
    } catch (e) {
      // DB might not exist yet
    }

    const TARGET_COUNT = 250;
    let allFiltered = [];
    let currentCursor = cursor;
    let hasMore = true;
    let finalNextPage = false;
    let finalEndCursor = null;
    let fetchCount = 0;
    const MAX_FETCHES = 3; // Reduced fetches for speed, while still aiming for 250

    while (allFiltered.length < TARGET_COUNT && hasMore && fetchCount < MAX_FETCHES) {
      fetchCount++;
      const { customers, hasNextPage, endCursor } = await fetchCustomers({ 
        cursor: currentCursor, 
        queryStr 
      });

      if (!customers || customers.length === 0) break;

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
          followupDate: displayFollowupDate,
          followupStatus
        };
      });

      let pageFiltered = enriched;
      if (status !== "all") {
        pageFiltered = enriched.filter(c => c.followupStatus === status);
      }

      if (dateFrom || dateTo) {
        pageFiltered = pageFiltered.filter(c => {
          if (!c.lastOrder?.processedAt) return false;
          const orderDate = c.lastOrder.processedAt.split("T")[0];
          if (dateFrom && orderDate < dateFrom) return false;
          if (dateTo && orderDate > dateTo) return false;
          return true;
        });
      }

      allFiltered.push(...pageFiltered);
      currentCursor = endCursor;
      hasMore = hasNextPage;
      finalNextPage = hasNextPage;
      finalEndCursor = endCursor;

      // If we are searching for a specific name/email matches are specific, stop early
      if (search && allFiltered.length > 0) break; 
    }

    // Local sorting by last order date (descending)
    allFiltered.sort((a, b) => {
      const dateA = a.lastOrder?.processedAt ? new Date(a.lastOrder.processedAt) : new Date(0);
      const dateB = b.lastOrder?.processedAt ? new Date(b.lastOrder.processedAt) : new Date(0);
      return dateB - dateA;
    });

    // Trim to target count
    const result = allFiltered.slice(0, TARGET_COUNT);

    return NextResponse.json({
      customers: result,
      hasNextPage: finalNextPage || (allFiltered.length > TARGET_COUNT),
      endCursor: finalEndCursor
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message }, 
      { status: 500 }
    );
  }
}
