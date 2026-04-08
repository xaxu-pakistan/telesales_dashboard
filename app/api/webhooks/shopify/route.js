import { NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/shopify";
import { syncSingleCustomer } from "@/lib/sync";

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256");
    const topic = req.headers.get("X-Shopify-Topic");
    const shopDomain = req.headers.get("X-Shopify-Shop-Domain");

    console.log(`Webhook received: ${topic} from ${shopDomain}`);

    // 1. Verify Webhook (if secret is configured)
    if (process.env.SHOPIFY_WEBHOOK_SECRET) {
      const isValid = verifyShopifyWebhook(rawBody, hmacHeader);
      if (!isValid) {
        console.error("Invalid webhook HMAC signature.");
        return new NextResponse("Unauthorized", { status: 401 });
      }
    } else {
      console.warn("SHOPIFY_WEBHOOK_SECRET not set. Skipping HMAC verification.");
    }

    const payload = JSON.parse(rawBody);

    // 2. Extract Customer ID based on topic
    let shopifyCustomerId = null;

    if (topic.startsWith("orders/")) {
      // Order webhooks (create, updated, fulfilled, etc.)
      shopifyCustomerId = payload.customer?.id;
    } else if (topic.startsWith("customers/")) {
      // Customer webhooks (create, updated)
      shopifyCustomerId = payload.id;
    }

    if (!shopifyCustomerId) {
      console.log(`No customer ID found in ${topic} payload. Skipping sync.`);
      return NextResponse.json({ message: "No customer to sync" });
    }

    // Convert numeric ID to string if needed (Shopify webhooks use numeric IDs)
    const stringId = String(shopifyCustomerId);

    // 3. Sync customer data from Shopify to MongoDB
    console.log(`Syncing customer ${stringId} due to ${topic} webhook...`);
    const result = await syncSingleCustomer(stringId);

    if (result) {
      console.log(`Successfully synced customer: ${result.firstName} ${result.lastName}`);
    } else {
      console.warn(`Customer ${stringId} not found in Shopify or failed to sync.`);
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing Shopify webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
