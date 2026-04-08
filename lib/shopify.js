const CUSTOMER_QUERY = `
  query getCustomers($cursor: String, $queryStr: String) {
    customers(first: 250, after: $cursor, query: $queryStr, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          firstName
          lastName
          email
          phone
          tags
          note
          numberOfOrders
          amountSpent {
            amount
            currencyCode
          }
          orders(first: 1, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                name
                processedAt
                shippingAddress { phone }
                billingAddress { phone }
                totalPriceSet {
                  shopMoney { amount currencyCode }
                }
                lineItems(first: 1) {
                  edges {
                    node { title quantity variantTitle }
                  }
                }
                fulfillments {
                  trackingInfo {
                    number
                    company
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchCustomers({ cursor = null, queryStr = "" } = {}) {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!domain || !accessToken) {
    throw new Error("Missing Shopify credentials. Check your .env.local file.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const maxRetries = 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(
        `https://${domain}/admin/api/2026-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: CUSTOMER_QUERY,
            variables: {
              cursor,
              queryStr,
            },
          }),
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (response.status === 429) {
        // Rate limited
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : 1000 * (attempt + 1);
        console.warn(
          `Shopify Rate Limited (Attempt ${attempt + 1}/${maxRetries}). Retrying in ${waitTime}ms...`,
        );
        await new Promise((res) => setTimeout(res, waitTime));
        attempt++;
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        console.error(`Shopify API Error (HTTP ${response.status}):`, text);
        throw new Error(`Shopify API error: ${response.status}`);
      }

      clearTimeout(timeoutId);
      const { data, errors } = await response.json();

      if (errors?.some((e) => e.extensions?.code === "THROTTLED")) {
        console.warn(
          `Shopify Throttled (Attempt ${attempt + 1}/${maxRetries}). Retrying...`,
        );
        await new Promise((res) => setTimeout(res, 2000 * (attempt + 1))); // Simple backoff
        attempt++;
        continue;
      }

      if (errors) {
        console.error(
          "Shopify GraphQL Errors:",
          JSON.stringify(errors, null, 2),
        );
        throw new Error(errors[0].message);
      }

      if (!data?.customers)
        return { customers: [], hasNextPage: false, endCursor: null };

      // Success processing...
      const customers = data.customers.edges.map(({ node }) => {
        let latestProcessedOrderNode = null;
        let fallbackPhone = "";

        for (const edge of node.orders?.edges || []) {
          if (!fallbackPhone) {
            fallbackPhone =
              edge.node.shippingAddress?.phone ||
              edge.node.billingAddress?.phone ||
              "";
          }
          if (edge.node.processedAt && !latestProcessedOrderNode) {
            latestProcessedOrderNode = edge.node;
          }
        }

        const orderNode = latestProcessedOrderNode;

        return {
          id: node.id.replace("gid://shopify/Customer/", ""),
          gid: node.id,
          firstName: node.firstName ?? "",
          lastName: node.lastName ?? "",
          email: node.email ?? "",
          phone: node.phone || fallbackPhone || "",
          tags: node.tags ?? [],
          note: node.note ?? "",
          numberOfOrders: node.numberOfOrders ?? 0,
          totalSpent: parseFloat(node.amountSpent?.amount ?? 0),
          lastOrder: orderNode
            ? {
                name: orderNode.name,
                processedAt: orderNode.processedAt,
                amount: parseFloat(
                  orderNode.totalPriceSet?.shopMoney?.amount ?? 0,
                ),
                currencyCode:
                  orderNode.totalPriceSet?.shopMoney?.currencyCode ?? "PKR",
                items:
                  orderNode.lineItems?.edges?.map((e) => ({
                    title: e.node.title,
                    variantTitle: e.node.variantTitle,
                    quantity: e.node.quantity,
                  })) ?? [],
                trackingNumbers:
                  orderNode.fulfillments?.flatMap(
                    (f) => f.trackingInfo?.map((t) => t.number) ?? [],
                  ) ?? [],
                trackingCompany:
                  orderNode.fulfillments?.[0]?.trackingInfo?.[0]?.company || null,
              }
            : null,
        };
      });

      return {
        customers,
        hasNextPage: data.customers.pageInfo.hasNextPage,
        endCursor: data.customers.pageInfo.endCursor,
      };
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("Shopify API timed out after 60s");
      }
      lastError = err;
      attempt++;
      // Wait before retrying on network errors
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }

  clearTimeout(timeoutId);
  throw (
    lastError || new Error("Failed to fetch customers after multiple attempts.")
  );
}

const UPDATE_NOTE_MUTATION = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        note
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function updateCustomerNote(id, note) {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const gid = id.startsWith("gid://") ? id : `gid://shopify/Customer/${id}`;

  const response = await fetch(
    `https://${domain}/admin/api/2026-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: UPDATE_NOTE_MUTATION,
        variables: {
          input: {
            id: gid,
            note: note,
          },
        },
      }),
    },
  );

  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);
  if (data.customerUpdate.userErrors.length > 0) {
    throw new Error(data.customerUpdate.userErrors[0].message);
  }
  return data.customerUpdate.customer;
}
