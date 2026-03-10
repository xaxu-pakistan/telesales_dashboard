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
    const startDate = searchParams.get("startDate") || null;
    const endDate = searchParams.get("endDate") || null;
    
    // Nov 2025 Cutoff and Order Count (>=2) are mandatory per user request
    let queryStr = "orders_count:>=2 last_order_date:>=2025-11-01";
    
    if (search) {
      // Shopify customer search supports name, email, phone
      queryStr += ` AND (name:${search}* OR email:${search}* OR phone:${search}*)`;
    }
    
    if (startDate) {
      queryStr += ` AND last_order_date:>=${startDate}`;
    }
    if (endDate) {
      queryStr += ` AND last_order_date:<=${endDate}`;
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

    return NextResponse.json({ 
      customers: enriched,
      hasNextPage,
      endCursor
    });
  } catch (err) {
    console.error("FATAL API ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch customers", details: err.message }, { status: 500 });
  }
}
