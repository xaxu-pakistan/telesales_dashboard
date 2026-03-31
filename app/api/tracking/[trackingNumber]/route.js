import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { trackingNumber } = await params;
  const { searchParams } = new URL(request.url);
  const orderReference = searchParams.get("orderReference");

  if (!trackingNumber && !orderReference) {
    return NextResponse.json(
      { error: "Tracking number or Order Reference is required" },
      { status: 400 }
    );
  }

  const token = process.env.POSTX_API_TOKEN;
  const apiUrl = process.env.POSTX_ORDER_TRACKING_API;

  if (!token || !apiUrl) {
    console.error("Missing PostX configuration");
    return NextResponse.json(
      { error: "Server misconfiguration regarding tracking API" },
      { status: 500 }
    );
  }

  async function tryFetch(identifier, isReference = false, debugLog) {
    if (!identifier) return null;
    
    const token = process.env.POSTX_API_TOKEN;
    const apiUrl = process.env.POSTX_ORDER_TRACKING_API;

    let urls = [];
    if (!isReference) {
      urls.push(`${apiUrl}/${encodeURIComponent(identifier)}`);
    } else {
      // Correctly derive base from https://api.postex.pk/services/integration/api/order/v1/track-order
      // Base should be https://api.postex.pk/services
      const baseUrl = apiUrl.split("/integration/")[0];
      
      urls.push(`${baseUrl}/integration/api/order/v1/track-order-by-customer-order-number/${encodeURIComponent(identifier)}`);
      urls.push(`${baseUrl}/v1/track-order-by-customer-order-number/${encodeURIComponent(identifier)}`);
      // Also try without the /services if that's how the API is structured
      const rootUrl = apiUrl.split("/services/")[0];
      if (rootUrl && rootUrl !== baseUrl) {
        urls.push(`${rootUrl}/services/v1/track-order-by-customer-order-number/${encodeURIComponent(identifier)}`);
        urls.push(`${rootUrl}/api/order/v1/track-order-by-customer-order-number/${encodeURIComponent(identifier)}`);
      }
    }

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { "token": token, "Content-Type": "application/json" },
          cache: "no-store",
        });

        debugLog.push({ url, status: response.status });

        if (!response.ok) continue;
        const data = await response.json();
        
        const hasDist = data.dist && (Array.isArray(data.dist) ? data.dist.length > 0 : true);
        const hasStatus = data.transactionStatus || (data.dist && (data.dist.transactionStatus || data.dist.orderStatus));
        
        if (data.statusCode === "200" && (hasDist || hasStatus)) return data;
        
        // If 200 but not found in body, log it
        if (data.statusCode === "404" || data.statusMessage?.includes("NOT FOUND")) {
           debugLog[debugLog.length-1].bodyStatus = data.statusMessage || "NOT FOUND";
        }
      } catch (e) {
        debugLog.push({ url, error: e.message });
        continue;
      }
    }
    return null;
  }

  try {
    let data = null;
    const debugAttempts = [];
    
    // 1. Try tracking number
    const validTN = trackingNumber && trackingNumber !== "null" && trackingNumber !== "undefined" && trackingNumber.trim() !== "";
    if (validTN) {
      data = await tryFetch(trackingNumber, false, debugAttempts);
    }

    // 2. Try raw order reference
    if (!data && orderReference) {
      data = await tryFetch(orderReference, true, debugAttempts);
    }

    // 3. Try numeric only
    if (!data && orderReference) {
      const numericPart = orderReference.replace(/\D/g, "");
      if (numericPart && numericPart.length > 3) {
        data = await tryFetch(numericPart, true, debugAttempts);
      }
    }

    // 4. Try without prefixes
    if (!data && orderReference) {
      const cleanRef = orderReference.replace(/^#|^XCACV|^XAXU/i, "");
      if (cleanRef !== orderReference) {
        data = await tryFetch(cleanRef, true, debugAttempts);
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: "Tracking information not found", debugAttempts },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...data, debugAttempts });
  } catch (error) {
    console.error("API Route Error (Tracking):", error);
    return NextResponse.json(
      { error: "Internal server error fetching tracking info" },
      { status: 500 }
    );
  }
}
