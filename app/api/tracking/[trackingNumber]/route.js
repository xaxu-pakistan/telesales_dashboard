import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { trackingNumber } = await params;
  const { searchParams } = new URL(request.url);
  const orderReference = searchParams.get("orderReference");
  const carrier = searchParams.get("carrier")?.toLowerCase();

  if (!trackingNumber && !orderReference) {
    return NextResponse.json(
      { error: "Tracking number or Order Reference is required" },
      { status: 400 }
    );
  }

  async function tryFetchPostX(identifier, isReference = false, debugLog) {
    if (!identifier) return null;
    const token = process.env.POSTX_API_TOKEN;
    const apiUrl = process.env.POSTX_ORDER_TRACKING_API;
    
    if (!token || !apiUrl) {
       debugLog.push({ error: "Missing PostX configuration" });
       return null;
    }

    let urls = [];
    if (!isReference) {
      urls.push(`${apiUrl}/${encodeURIComponent(identifier)}`);
    } else {
      const baseUrl = apiUrl.split("/integration/")[0];
      urls.push(`${baseUrl}/integration/api/order/v1/track-order-by-customer-order-number/${encodeURIComponent(identifier)}`);
      urls.push(`${baseUrl}/v1/track-order-by-customer-order-number/${encodeURIComponent(identifier)}`);
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
        
        if (data.statusCode === "200" && (hasDist || hasStatus)) return { ...data, tracked_carrier: "postex" };
        
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

  async function tryFetchTrax(identifier, debugLog) {
    if (!identifier) return null;
    const token = process.env.TRAX_API_TOKEN;
    const trackUrl = process.env.TRAX_TRACKING_HISTORY;
    const statusUrl = process.env.TRAX_CURRENT_TRACKING_STATUS;

    let urls = [];
    
    // Add Sonic PK endpoint as requested by user
    urls.push(`https://sonic.pk/api/shipment/track?tracking_number=${encodeURIComponent(identifier)}&type=0`);
    urls.push(`https://sonic.pk/api/shipment/track?tracking_number=${encodeURIComponent(identifier)}&type=1`);
    
    if (trackUrl) {
      urls.push(`${trackUrl}?tracking_number=${encodeURIComponent(identifier)}&type=0`);
      urls.push(`${trackUrl}?tracking_number=${encodeURIComponent(identifier)}&type=1`);
    }
    if (statusUrl) {
      urls.push(`${statusUrl}?tracking_number=${encodeURIComponent(identifier)}&type=0`);
      urls.push(`${statusUrl}?tracking_number=${encodeURIComponent(identifier)}&type=1`);
    }

    for (const url of urls) {
      try {
        const fetchOptions = {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        };
        
        // Send the token to all endpoints including sonic.pk
        if (token) {
          fetchOptions.headers["Authorization"] = token;
        }

        const response = await fetch(url, fetchOptions);

        debugLog.push({ url, status: response.status });

        if (!response.ok) continue;
        const data = await response.json();
        
        // Trax usually returns status 0 or 1 for success. 
        // We also check if it contains tracking-like data fields.
        const isSuccess = data && (data.status === 0 || data.status === 1 || data.status === 200 || data.status === "0" || data.status === "1" || data.status === "success" || data.message === "Success");
        const hasData = data && (data.details || data.tracking_history || data.history || data.current_status || data.data?.history || data.data?.status);

        if (isSuccess || hasData) {
            return { ...data, tracked_carrier: "trax" };
        }
        
        if (data && !isSuccess) {
           debugLog[debugLog.length-1].bodyStatus = data.message || "ERROR";
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
    
    // If carrier is known, prioritize it
    const tryTraxFirst = carrier === "trax";

    if (validTN) {
      if (tryTraxFirst) {
        data = await tryFetchTrax(trackingNumber, debugAttempts);
        if (!data) data = await tryFetchPostX(trackingNumber, false, debugAttempts);
      } else {
        data = await tryFetchPostX(trackingNumber, false, debugAttempts);
        if (!data) data = await tryFetchTrax(trackingNumber, debugAttempts);
      }
    }

    // 2. Try raw order reference
    if (!data && orderReference) {
      if (tryTraxFirst) {
        data = await tryFetchTrax(orderReference, debugAttempts);
        if (!data) data = await tryFetchPostX(orderReference, true, debugAttempts);
      } else {
        data = await tryFetchPostX(orderReference, true, debugAttempts);
        if (!data) data = await tryFetchTrax(orderReference, debugAttempts);
      }
    }

    // 3. Try numeric only
    if (!data && orderReference) {
      const numericPart = orderReference.replace(/\D/g, "");
      if (numericPart && numericPart.length > 3) {
        if (tryTraxFirst) {
           data = await tryFetchTrax(numericPart, debugAttempts);
           if (!data) data = await tryFetchPostX(numericPart, true, debugAttempts);
        } else {
           data = await tryFetchPostX(numericPart, true, debugAttempts);
           if (!data) data = await tryFetchTrax(numericPart, debugAttempts);
        }
      }
    }

    // 4. Try without prefixes
    if (!data && orderReference) {
      const cleanRef = orderReference.replace(/^#|^XCACV|^XAXU/i, "");
      if (cleanRef !== orderReference) {
        if (tryTraxFirst) {
          data = await tryFetchTrax(cleanRef, debugAttempts);
          if (!data) data = await tryFetchPostX(cleanRef, true, debugAttempts);
        } else {
          data = await tryFetchPostX(cleanRef, true, debugAttempts);
          if (!data) data = await tryFetchTrax(cleanRef, debugAttempts);
        }
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
