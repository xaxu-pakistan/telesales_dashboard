import { fetchCustomers } from "./lib/shopify.js";

async function run() {
  try {
    const { customers } = await fetchCustomers();
    console.log(JSON.stringify(customers[0], null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
