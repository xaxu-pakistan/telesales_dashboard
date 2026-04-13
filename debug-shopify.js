const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const domain = process.env.SHOPIFY_STORE;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

async function test() {
  console.log('Testing with Domain:', domain);
  const query = `
    query getCustomers($cursor: String, $queryStr: String) {
      customers(first: 5, after: $cursor, query: $queryStr, sortKey: LAST_ORDER_DATE) {
        edges {
          node {
            id
            firstName
            numberOfOrders
          }
        }
      }
    }
  `;

  const variables = {
    cursor: null,
    queryStr: "orders_count:>=2 last_order_date:>=2025-11-01"
  };

  try {
    const response = await fetch(`https://\${domain}/admin/api/2026-01/graphql.json\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log('HTTP Status:', response.status);
    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

test();
