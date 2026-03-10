async function run() {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const query = `
    query {
      customers(first: 5, query: "orders_count:>=2 last_order_date:>=2025-11-01") {
        edges {
          node {
            id
            orders(first: 1, sortKey: PROCESSED_AT, reverse: true) {
              edges {
                node {
                  processedAt
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(`https://${domain}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query })
  });
  
  const text = await res.json();
  console.log(JSON.stringify(text, null, 2));
}
run();
