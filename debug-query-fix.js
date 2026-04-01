async function run() {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!domain || !accessToken) {
    console.error("Missing credentials");
    return;
  }

  // Testing the exact query that might be failing
  const query = `
    query getCustomers($queryStr: String) {
      customers(first: 5, query: $queryStr, sortKey: LAST_ORDER_DATE, reverse: true) {
        edges {
          node {
            id
            firstName
            lastName
          }
        }
      }
    }
  `;

  const variables = {
    queryStr: "orders_count:>=1 last_order_date:>=2024-11-01"
  };

  try {
    const res = await fetch(`https://${domain}/admin/api/2026-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables })
    });
    
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Fetch failed", e);
  }
}
run();
