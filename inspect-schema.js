// const { fetch } = require("undici"); // Node 22 has global fetch
require("dotenv").config({ path: ".env.local" });

const INTROSPECTION_QUERY = `
  query {
    __type(name: "FulfillmentLineItem") {
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

async function inspectReturn() {
  const domain = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  console.log("Inspecting 'Return' type in Shopify GraphQL...");

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

    const { data, errors } = await response.json();
    if (errors) {
      console.error("GraphQL Errors:", errors);
      return;
    }

    if (!data?.__type) {
      console.error("Type 'Return' not found in schema.");
      return;
    }

    console.log("Fields on 'Return' type:");
    data.__type.fields.forEach(f => {
      console.log(` - ${f.name} (${f.type.name || f.type.kind})`);
    });

  } catch (err) {
    console.error("Network Error:", err.message);
  }
}

inspectReturn();
