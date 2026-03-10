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

    const MANDATORY_CUTOFF = "2024-11-01";
    const today = new Date();

    const dateAtOffset = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d.toISOString().split("T")[0];
    };

    let conditions = ["orders_count:>=2"];

    // 1. Handle "Order From" and Baseline
    let effectiveFrom = dateFrom ? dateFrom.split("T")[0] : MANDATORY_CUTOFF;
    conditions.push(`last_order_date:>=${effectiveFrom}`);

    // 2. Handle "Order To"
    if (dateTo) {
      const to = dateTo.split("T")[0];
      conditions.push(`last_order_date:<=${to}`);
    }

    // ... (rest of the query logic) ...
    // ... (rest of the query logic) ...

    // 4. Search term with quoting for safety
    if (search) {
      const s = search.replace(/"/g, '\\"');
      conditions.push(`(name:"${s}*" OR email:"${s}*" OR phone:"${s}*")`);
    }

    const queryStr = conditions.join(" AND ");

    const { customers, hasNextPage, endCursor } = await fetchCustomers({
      cursor,
      queryStr,
    });

    const followupsDb = await getFollowupsDb();

    // Enrich with follow-up logic
    const enriched = customers
      .map((customer) => {
        try {
          const adminUrl = `https://${process.env.SHOPIFY_ADMIN_URL}/${customer.id}`;
          // https://admin.shopify.com/store/xaxupakistan/customers/9156013916332
          let followupDate = null;

          if (customer.lastOrder) {
            followupDate = calculateFollowupDate(
              customer.lastOrder.processedAt,
              customer.lastOrder.amount,
              customer.lastOrder.items,
            );
          }

          const followupStatus = getFollowupStatus(
            followupDate,
            !!followupsDb[customer.id],
          );

          return {
            ...customer,
            customerId: customer.id,
            adminUrl,
            followupDate,
            followupStatus,
          };
        } catch (itemErr) {
          console.error("Error enriching customer:", customer.id, itemErr);
          return null;
        }
      })
      .filter((c) => {
        if (!c) return false;
        if (!c.lastOrder || !c.lastOrder.processedAt) return false;

        const orderDateStr = c.lastOrder.processedAt.split("T")[0];

        // If user picked a date, enforce it strictly
        if (dateFrom) {
          if (orderDateStr < dateFrom.split("T")[0]) return false;
        } else {
          // Otherwise use the default baseline
          if (orderDateStr < MANDATORY_CUTOFF) return false;
        }

        if (dateTo) {
          if (orderDateStr > dateTo.split("T")[0]) return false;
        }

        return true;
      });

    const filtered =
      status === "all"
        ? enriched
        : enriched.filter((c) => c.followupStatus === status);

    return NextResponse.json({
      customers: filtered,
      hasNextPage,
      endCursor,
    });
  } catch (err) {
    console.error("FATAL API ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch customers", details: err.message },
      { status: 500 },
    );
  }
}
