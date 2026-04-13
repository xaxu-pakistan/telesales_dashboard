import { fetchCustomers, fetchCustomerById, fetchReturns, fetchReturnById, fetchCancelledOrders } from "./shopify.js";

import dbConnect from "./db.js";
import Customer from "../app/models/Customer.js";
import Return from "../app/models/Return.js";
import CancelledOrder from "../app/models/CancelledOrder.js";
import fs from "fs/promises";
import path from "path";
import { calculateFollowupDate, getFollowupStatus, formatFollowupDate } from "./followup.js";

export async function syncCancelledOrders() {
  await dbConnect();

  let currentCursor = null;
  let hasMore = true;
  let totalSynced = 0;

  console.log("Starting cancelled orders sync from Shopify...");

  while (hasMore) {
    try {
      const { orders, hasNextPage, endCursor } = await fetchCancelledOrders({
        cursor: currentCursor,
      });

      if (!orders || orders.length === 0) {
        if (!hasNextPage) break;
        currentCursor = endCursor;
        continue;
      }

      const bulkOps = orders.map((o) => ({
        updateOne: {
          filter: { shopifyId: o.id },
          update: {
            $set: {
              gid: o.gid,
              name: o.name,
              cancelledAt: o.cancelledAt,
              cancelReason: o.cancelReason,
              displayFinancialStatus: o.displayFinancialStatus,
              totalPrice: o.totalPrice,
              currencyCode: o.currencyCode,
              customer: o.customer,
              lineItems: o.lineItems,
              lastSyncAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      await CancelledOrder.bulkWrite(bulkOps);
      
      totalSynced += orders.length;
      console.log(`Synced ${totalSynced} cancelled orders...`);

      currentCursor = endCursor;
      hasMore = hasNextPage;
    } catch (err) {
      console.error("Error during cancelled orders sync batch:", err);
      break;
    }
  }

  console.log(`Cancelled orders sync completed. Total synced: ${totalSynced}`);
  return totalSynced;
}


export async function syncSingleReturn(shopifyId) {
  await dbConnect();

  const r = await fetchReturnById(shopifyId);
  if (!r) return null;

  const updatedReturn = await Return.findOneAndUpdate(
    { shopifyId: r.id },
    {
      $set: {
        gid: r.gid,
        name: r.name,
        status: r.status,
        order: r.order,
        customer: r.customer,
        totalQuantity: r.totalQuantity,
        returnLineItems: r.returnLineItems,
        returnCreatedAt: r.returnCreatedAt,
        lastSyncAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return updatedReturn;
}

export async function syncReturns() {
  await dbConnect();

  let currentCursor = null;
  let hasMore = true;
  let totalSynced = 0;

  console.log("Starting returns sync from Shopify...");

  while (hasMore) {
    try {
      const { returns, hasNextPage, endCursor } = await fetchReturns({
        cursor: currentCursor,
      });

      if (!returns || returns.length === 0) {
        if (!hasNextPage) break;
        currentCursor = endCursor;
        continue;
      }

      const bulkOps = returns.map((r) => ({
        updateOne: {
          filter: { shopifyId: r.id },
          update: {
            $set: {
              gid: r.gid,
              name: r.name,
              status: r.status,
              order: r.order,
              customer: r.customer,
              totalQuantity: r.totalQuantity,
              returnLineItems: r.returnLineItems,
              returnCreatedAt: r.returnCreatedAt,
              lastSyncAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      await Return.bulkWrite(bulkOps);
      
      totalSynced += returns.length;
      console.log(`Synced ${totalSynced} returns...`);

      currentCursor = endCursor;
      hasMore = hasNextPage;
    } catch (err) {
      console.error("Error during returns sync batch:", err);
      break;
    }
  }

  console.log(`Returns sync completed. Total synced: ${totalSynced}`);
  return totalSynced;
}

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
    { upsert: true, returnDocument: 'after' }
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
