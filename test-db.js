const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URL;

async function test() {
  console.log("Connecting to:", MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    // Try to define model manually for test
    const CustomerSchema = new mongoose.Schema({ shopifyId: String });
    const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
    
    const count = await Customer.countDocuments();
    console.log("Customer count:", count);

    process.exit(0);
  } catch (err) {
    console.error("Connection error:", err);
    process.exit(1);
  }
}

test();
