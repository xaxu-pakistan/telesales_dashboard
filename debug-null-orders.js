import { fetchCustomers } from "./lib/shopify.js";

async function run() {
  const queryStr = "orders_count:>=2 last_order_date:>=2025-11-01";
  console.log("Running debug fetch with query:", queryStr);
  
  try {
    const { customers } = await fetchCustomers({ queryStr });
    
    const issues = customers.filter(c => !c.lastOrder);
    
    if (issues.length > 0) {
      console.log(`Found ${issues.length} customers with missing lastOrder out of ${customers.length}.`);
      console.log("First issue example:", JSON.stringify(issues[0], null, 2));
      
      // Check if maybe they have orders but with a different sort?
      // Or maybe the orders field needs different permissions?
    } else {
      console.log("No issues found in this batch of 50 customers.");
      if (customers.length > 0) {
        console.log("Sample customer with order:", JSON.stringify(customers[0], null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
