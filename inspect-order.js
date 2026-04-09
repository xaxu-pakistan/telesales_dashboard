// const { fetch } = require("undici");
require("dotenv").config({ path: ".env.local" });

const INTROSPECTION_QUERY = `
  query {
    __type(name: "Order") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

async function inspectOrder() {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  console.log("Inspecting 'Order' type in Shopify GraphQL...");

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
          query: INTROSPECTION_QUERY,
        }),
      }
    );

    const data = await response.json();
    console.log("Fields on 'Order' type:");
    data.data.__type.fields.forEach(f => {
      console.log(` - ${f.name} (${f.type.name || f.type.kind})`);
    });

  } catch (err) {
    console.error("Error:", err.message);
  }
}

inspectOrder();
