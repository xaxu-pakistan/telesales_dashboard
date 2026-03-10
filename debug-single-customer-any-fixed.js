import fetch from "node-fetch";

async function run() {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const query = `
    query {
      customer(id: "gid://shopify/Customer/7996866330796") {
        id
        firstName
        lastName
        numberOfOrders
        orders(first: 5, query: "status:any") {
          edges {
            node {
              id
              name
              processedAt
              displayFinancialStatus
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
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
