const CUSTOMER_QUERY = `
  query getCustomers($cursor: String, $queryStr: String) {
    customers(first: 50, after: $cursor, query: $queryStr, sortKey: UPDATED_AT, reverse: true) {
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
          orders(first: 5, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                name
                processedAt
                totalPriceSet {
                  shopMoney { amount currencyCode }
                }
                lineItems(first: 5) {
                  edges {
                    node { title quantity }
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
            queryStr
          },
        }),
        cache: "no-store",
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error("Rate limited by Shopify. Please try again in a few seconds.");
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("Shopify error body:", text);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const { data, errors } = await response.json();

    if (errors?.some((e) => e.extensions?.code === "THROTTLED")) {
      throw new Error("Shopify API throttled. Please try again.");
    }

    if (errors) throw new Error(errors[0].message);
    if (!data?.customers) return { customers: [], hasNextPage: false, endCursor: null };

        const customers = data.customers.edges.map(({ node }) => {

          let latestProcessedOrderNode = null;

          // Iterate through the fetched orders to find the most recent one with a processedAt date

          for (const edge of node.orders?.edges || []) {

            if (edge.node.processedAt) {

              latestProcessedOrderNode = edge.node;

              break; // Found the most recent processed order, stop iterating

            }

          }

    

                      // If no processed order was found within the fetched 5, lastOrder will be null

    

                      const orderNode = latestProcessedOrderNode;

    

                

    

          

    

          return {

            id: node.id.replace("gid://shopify/Customer/", ""),

            gid: node.id,

            firstName: node.firstName ?? "",

            lastName: node.lastName ?? "",

            email: node.email ?? "",

            phone: node.phone ?? "",

                                    tags: node.tags ?? [],

                                    note: node.note ?? "",

                                    numberOfOrders: node.numberOfOrders ?? 0,

            totalSpent: parseFloat(node.amountSpent?.amount ?? 0),

            lastOrder: orderNode

              ? {

                  name: orderNode.name,

                  processedAt: orderNode.processedAt,

                  amount: parseFloat(orderNode.totalPriceSet?.shopMoney?.amount ?? 0),

                  currencyCode: orderNode.totalPriceSet?.shopMoney?.currencyCode ?? "PKR",

                  items: orderNode.lineItems?.edges?.map((e) => ({

                    title: e.node.title,

                    quantity: e.node.quantity,

                  })) ?? [],

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
    clearTimeout(timeoutId);
    if (err.name === "AbortError") throw new Error("Shopify API timed out after 60s");
    throw err;
  }
}
