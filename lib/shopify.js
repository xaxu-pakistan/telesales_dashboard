import crypto from "crypto";

export function verifyShopifyWebhook(body, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmacHeader) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return hash === hmacHeader;
}

const RETURNS_QUERY = `
  query GetReturns($first: Int!, $after: String) {
    orders(first: $first, after: $after, query: "return_status:in_progress OR return_status:returned", sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          email
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          returns(first: 10) {
            edges {
              node {
                id
                status
                totalQuantity
                name
                returnCreatedAt: createdAt
                returnLineItems(first: 10) {
                  edges {
                    node {
                      id
                      quantity
                      refundableQuantity
                      returnReason
                      returnReasonNote
                      customerNote
                      ... on ReturnLineItem {
                        fulfillmentLineItem {
                          id
                          quantity
                          lineItem {
                            id
                            title
                            sku
                          }
                        }
                      }
                    }
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

export async function fetchReturns({ cursor = null } = {}) {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const response = await fetch(
    `https://${domain}/admin/api/unstable/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: RETURNS_QUERY,
        variables: {
          first: 50,
          after: cursor,
        },
      }),
    },
  );

  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);

  if (!data?.orders)
    return { returns: [], hasNextPage: false, endCursor: null };

  const returns = [];
  for (const orderEdge of data.orders.edges) {
    const parentOrder = orderEdge.node;
    if (parentOrder.returns && parentOrder.returns.edges) {
      for (const returnEdge of parentOrder.returns.edges) {
        const node = returnEdge.node;
        returns.push({
          id: node.id.replace("gid://shopify/Return/", ""),
          gid: node.id,
          name: node.name,
          status: node.status,
          returnCreatedAt: node.returnCreatedAt
            ? new Date(node.returnCreatedAt)
            : null,
          totalQuantity: node.totalQuantity,
          order: {
            shopifyId: parentOrder.id.replace("gid://shopify/Order/", ""),
            gid: parentOrder.id,
            name: parentOrder.name,
            email: parentOrder.email,
            totalPrice: parseFloat(parentOrder.totalPriceSet?.shopMoney?.amount ?? 0),
            currencyCode: parentOrder.totalPriceSet?.shopMoney?.currencyCode ?? "PKR",
          },

          customer: {
            email: parentOrder.email,
          },
          returnLineItems: node.returnLineItems.edges.map(({ node: item }) => ({
            shopifyId: item.id.replace("gid://shopify/ReturnLineItem/", ""),
            title: item.fulfillmentLineItem?.lineItem?.title || "Unknown Item",
            variantTitle:
              item.fulfillmentLineItem?.lineItem?.variant?.title || "",
            quantity: item.quantity,
            returnReason: item.returnReason,
            returnReasonNote: item.returnReasonNote || item.customerNote,
          })),
        });
      }
    }
  }

  return {
    returns,
    hasNextPage: data.orders.pageInfo.hasNextPage,
    endCursor: data.orders.pageInfo.endCursor,
  };
}

const SINGLE_RETURN_QUERY = `
  query GetReturn($id: ID!) {
    return(id: $id) {
      id
      name
      status
      totalQuantity
      returnCreatedAt: createdAt
      order {
        id
        name
        email
      }
      returnLineItems(first: 50) {
        edges {
          node {
            id
            quantity
            returnReason
            returnReasonNote
            customerNote
            refundableQuantity
            ... on ReturnLineItem {
              fulfillmentLineItem {
                lineItem {
                  title
                  sku
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchReturnById(id) {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const gid = id.startsWith("gid://") ? id : `gid://shopify/Return/${id}`;

  const response = await fetch(
    `https://${domain}/admin/api/unstable/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: SINGLE_RETURN_QUERY,
        variables: { id: gid },
      }),
    },
  );

  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);
  if (!data?.return) return null;

  const node = data.return;
  return {
    id: node.id.replace("gid://shopify/Return/", ""),
    gid: node.id,
    name: node.name,
    status: node.status,
    returnCreatedAt: node.returnCreatedAt
      ? new Date(node.returnCreatedAt)
      : null,
    totalQuantity: node.totalQuantity,
    order: {
      shopifyId: node.order?.id?.replace("gid://shopify/Order/", ""),
      gid: node.order?.id,
      name: node.order?.name,
      email: node.order?.email,
    },
    customer: {
      email: node.order?.email,
    },
    returnLineItems: node.returnLineItems.edges.map(({ node: item }) => ({
      shopifyId: item.id.replace("gid://shopify/ReturnLineItem/", ""),
      title: item.fulfillmentLineItem?.lineItem?.title || "Unknown Item",
      variantTitle: item.fulfillmentLineItem?.lineItem?.variant?.title || "",
      quantity: item.quantity,
      returnReason: item.returnReason,
      returnReasonNote: item.returnReasonNote || item.customerNote,
    })),
  };
}

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
        `https://${domain}/admin/api/2025-01/graphql.json`,
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
                  orderNode.fulfillments?.[0]?.trackingInfo?.[0]?.company ||
                  null,
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

const SINGLE_CUSTOMER_QUERY = `
  query getCustomer($id: ID!) {
    customer(id: $id) {
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
            lineItems(first: 5) {
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
`;

export async function fetchCustomerById(id) {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const gid = id.startsWith("gid://") ? id : `gid://shopify/Customer/${id}`;

  const response = await fetch(
    `https://${domain}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: SINGLE_CUSTOMER_QUERY,
        variables: { id: gid },
      }),
    },
  );

  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);
  if (!data?.customer) return null;

  const node = data.customer;
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
          amount: parseFloat(orderNode.totalPriceSet?.shopMoney?.amount ?? 0),
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
    `https://${domain}/admin/api/2025-01/graphql.json`,
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

const CANCELLED_ORDERS_QUERY = `
  query getCancelledOrders($cursor: String) {
    orders(
      first: 50
      after: $cursor
      query: "status:cancelled"
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          cancelledAt
          cancelReason
          displayFinancialStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            displayName
            email
            phone
          }
          lineItems(first: 10) {
            edges {
              node {
                title
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
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

export async function fetchCancelledOrders({ cursor = null } = {}) {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!domain || !accessToken) {
    throw new Error("Missing Shopify credentials. Check your .env.local file.");
  }

  const maxRetries = 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(
        `https://${domain}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: CANCELLED_ORDERS_QUERY,
            variables: { cursor },
          }),
          cache: "no-store",
        }
      );

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000 * (attempt + 1);
        console.warn(`Shopify Rate Limited (Attempt ${attempt + 1}/${maxRetries}). Retrying in ${waitTime}ms...`);
        await new Promise((res) => setTimeout(res, waitTime));
        attempt++;
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${text}`);
      }

      const { data, errors } = await response.json();

      if (errors?.some((e) => e.extensions?.code === "THROTTLED")) {
        await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
        attempt++;
        continue;
      }

      if (errors) throw new Error(errors[0].message);

      if (!data?.orders)
        return { orders: [], hasNextPage: false, endCursor: null };

      const orders = data.orders.edges.map(({ node }) => ({
        id: node.id.replace("gid://shopify/Order/", ""),
        gid: node.id,
        name: node.name,
        cancelledAt: node.cancelledAt ? new Date(node.cancelledAt) : null,
        cancelReason: node.cancelReason || null,
        displayFinancialStatus: node.displayFinancialStatus || null,
        totalPrice: parseFloat(node.totalPriceSet?.shopMoney?.amount ?? 0),
        currencyCode: node.totalPriceSet?.shopMoney?.currencyCode ?? "PKR",
        customer: {
          displayName: node.customer?.displayName || "",
          email: node.customer?.email || "",
          phone: node.customer?.phone || "",
        },
        lineItems: node.lineItems.edges.map(({ node: item }) => ({
          title: item.title,
          quantity: item.quantity,
          unitPrice: parseFloat(item.originalUnitPriceSet?.shopMoney?.amount ?? 0),
        })),
      }));

      return {
        orders,
        hasNextPage: data.orders.pageInfo.hasNextPage,
        endCursor: data.orders.pageInfo.endCursor,
      };
    } catch (err) {
      lastError = err;
      attempt++;
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }

  throw lastError || new Error("Failed to fetch cancelled orders after multiple attempts.");
}
