import { fetchCustomers, fetchCustomerById } from "./shopify";
import dbConnect from "./db";
import Customer from "@/app/models/Customer";
import fs from "fs/promises";
import path from "path";
import { calculateFollowupDate, getFollowupStatus, formatFollowupDate } from "./followup";

export async function syncSingleCustomer(shopifyId) {
  await dbConnect();

  // Load followups DB (marks items as "done")
  const dbPath = path.join(process.cwd(), "data", "followups.json");
  let followupsDb = {};
  try {
    const dbContent = await fs.readFile(dbPath, "utf8");
    followupsDb = JSON.parse(dbContent);
  } catch (e) {}

  const c = await fetchCustomerById(shopifyId);
  if (!c) return null;

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

  const updatedCustomer = await Customer.findOneAndUpdate(
    { shopifyId: c.id },
    {
      $set: {
        gid: c.gid,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        tags: c.tags,
        note: c.note,
        numberOfOrders: c.numberOfOrders,
        totalSpent: c.totalSpent,
        lastOrder: c.lastOrder,
        followupDate: displayFollowupDate,
        followupStatus,
        lastSyncAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return updatedCustomer;
}

export async function syncCustomers() {
  await dbConnect();

  // Load followups DB (marks items as "done")
  const dbPath = path.join(process.cwd(), "data", "followups.json");
  let followupsDb = {};
  try {
    const dbContent = await fs.readFile(dbPath, "utf8");
    followupsDb = JSON.parse(dbContent);
  } catch (e) {
    // DB might not exist yet
  }

  const MANDATORY_CUTOFF = "2024-11-01";
  const queryStr = `orders_count:>=1 AND last_order_date:>=${MANDATORY_CUTOFF}`;

  let currentCursor = null;
  let hasMore = true;
  let totalSynced = 0;

  console.log("Starting full sync from Shopify...");

  while (hasMore) {
    try {
      const { customers, hasNextPage, endCursor } = await fetchCustomers({
        cursor: currentCursor,
        queryStr,
      });

      if (!customers || customers.length === 0) break;

      const bulkOps = customers.map((c) => {
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

        return {
          updateOne: {
            filter: { shopifyId: c.id },
            update: {
              $set: {
                gid: c.gid,
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email,
                phone: c.phone,
                tags: c.tags,
                note: c.note,
                numberOfOrders: c.numberOfOrders,
                totalSpent: c.totalSpent,
                lastOrder: c.lastOrder,
                followupDate: displayFollowupDate,
                followupStatus,
                lastSyncAt: new Date(),
              },
            },
            upsert: true,
          },
        };
      });

      await Customer.bulkWrite(bulkOps);
      
      totalSynced += customers.length;
      console.log(`Synced ${totalSynced} customers...`);

      currentCursor = endCursor;
      hasMore = hasNextPage;

      // Optional: stop after a reasonable number if we don't want a full sync every time
      // But for "exactly like Shopify" speed, we want everything in MongoDB.
      // Shopify has a 250 limit per page, so we follow that.
    } catch (err) {
      console.error("Error during sync batch:", err);
      break;
    }
  }

  console.log(`Sync completed. Total synced: ${totalSynced}`);
  return totalSynced;
}
