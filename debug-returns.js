const { fetchReturns } = require("./lib/shopify");
require("dotenv").config({ path: ".env.local" });

async function testReturns() {
  console.log("Fetching returns from Shopify...");
  try {
    const data = await fetchReturns();
    console.log("Success!");
    console.log(`Found ${data.returns.length} returns.`);
    if (data.returns.length > 0) {
      console.log("Sample Return:", JSON.stringify(data.returns[0], null, 2));
    } else {
      console.log("No returns found in the Shopify response.");
      console.log("Check if your store has any actual returns created (Orders > Returns).");
    }
  } catch (err) {
    console.error("Error fetching returns:", err.message);
  }
}

testReturns();
