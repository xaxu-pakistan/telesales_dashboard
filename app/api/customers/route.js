import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { fetchCustomers } from "@/lib/shopify";
import { calculateFollowupDate, getFollowupStatus } from "@/lib/followup";

const dbPath = path.join(process.cwd(), "data", "followups.json");

async function getFollowupsDb() {
  try {
    const data = await fs.readFile(dbPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || null;
    const search = searchParams.get("search") || "";
    const dateFrom = searchParams.get("dateFrom") || null;
    const dateTo = searchParams.get("dateTo") || null;
    const status = searchParams.get("status") || "all";
    
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    // Default cutoff if no date filter provided
    const defaultDate = "2025-11-01";
    
    let queryStr = "orders_count:>=2";

    // Optimization: Add date constraints to Shopify query based on status to reduce search space
    if (status === "overdue") {
        // At minimum, overdue means last order was at least 7 days ago
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
        queryStr += ` AND last_order_date:<=${sevenDaysAgoStr}`;
    } else if (status === "due-today" || status === "upcoming") {
        // These statuses usually mean last order was within last 45 days
        const fortyFiveDaysAgo = new Date(today);
        fortyFiveDaysAgo.setDate(today.getDate() - 45);
        const fortyFiveDaysAgoStr = fortyFiveDaysAgo.toISOString().split("T")[0];
        queryStr += ` AND last_order_date:>=${fortyFiveDaysAgoStr}`;
    }

    if (dateFrom) {
      const from = dateFrom.split("T")[0];
      queryStr += ` AND last_order_date:>=${from}`;
    } else if (!queryStr.includes("last_order_date:>=")) {
      // Apply default cutoff only if no other lower bound is set
      queryStr += ` AND last_order_date:>=${defaultDate}`;
    }

    if (dateTo) {
      const to = dateTo.split("T")[0];
      queryStr += ` AND last_order_date:<=${to}`;
    }
    
    if (search) {
      // Shopify customer search supports name, email, phone
      queryStr += ` AND (name:${search}* OR email:${search}* OR phone:${search}*)`;
    }

    const { customers, hasNextPage, endCursor } = await fetchCustomers({ 
      cursor, 
      queryStr 
    });

    const followupsDb = await getFollowupsDb();
    
    // Enrich with follow-up logic (this part remains local for now as it uses local DB)
    const enriched = customers.map(customer => {
      try {
        const adminUrl = `https://${process.env.SHOPIFY_STORE}/admin/customers/${customer.id}`;
        let followupDate = null;
        
        if (customer.lastOrder) {
          followupDate = calculateFollowupDate(customer.lastOrder.processedAt, customer.lastOrder.amount);
        }
        
        const followupStatus = getFollowupStatus(followupDate, !!followupsDb[customer.id]);
        
        return {
          ...customer,
          customerId: customer.id,
          adminUrl,
          followupDate,
          followupStatus
        };
      } catch (itemErr) {
        console.error("Error enriching customer:", customer.id, itemErr);
        return null;
      }
    }).filter(c => c !== null);

    const filtered = status === "all" ? enriched : enriched.filter(c => c.followupStatus === status);

    return NextResponse.json({ 
      customers: filtered,
      hasNextPage,
      endCursor
    });
  } catch (err) {
    console.error("FATAL API ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch customers", details: err.message }, { status: 500 });
  }
}
