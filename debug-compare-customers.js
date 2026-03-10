import fetch from "node-fetch";

async function run() {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const query = `
    query {
      customers(first: 20, query: "orders_count:>=2 last_order_date:>=2025-11-01") {
        edges {
          node {
            id
            firstName
            numberOfOrders
            orders(first: 1) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(`https://${domain}/admin/api/2026-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query })
    });
    
    const data = await res.json();
    const customers = data.data.customers.edges.map(e => ({
      id: e.node.id,
      name: e.node.firstName,
      count: e.node.numberOfOrders,
      hasOrders: e.node.orders.edges.length > 0
    }));
    console.table(customers);
  } catch (err) {
    console.error(err);
  }
}
run();
