import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import dbConnect from "@/lib/db";
import Customer from "@/app/models/Customer";

const dbPath = path.join(process.cwd(), "data", "followups.json");

async function readDb() {
  try {
    const data = await fs.readFile(dbPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(dbPath, JSON.stringify({}));
      return {};
    }
    throw err;
  }
}

async function writeDb(data) {
  const dir = path.dirname(dbPath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function POST(request, { params }) {
  try {
    const p = await params;
    const customerId = p.customerId;
    const db = await readDb();
    db[customerId] = "done";
    await writeDb(db);

    // Update MongoDB
    await dbConnect();
    await Customer.findOneAndUpdate(
      { shopifyId: customerId },
      { $set: { followupStatus: "done" } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error setting followup done:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const p = await params;
    const customerId = p.customerId;
    const db = await readDb();
    if (db[customerId]) {
      delete db[customerId];
      await writeDb(db);
    }

    // Recalculate status for MongoDB
    await dbConnect();
    const customer = await Customer.findOne({ shopifyId: customerId });
    if (customer && customer.followupDate) {
        // Simple recalculation - could be improved by using lib/followup
        const todayStr = new Date().toISOString().split("T")[0];
        let newStatus = "upcoming";
        const fDate = new Date(customer.followupDate).toISOString().split("T")[0];
        if (fDate < todayStr) newStatus = "overdue";
        else if (fDate === todayStr) newStatus = "due-today";
        
        await Customer.findOneAndUpdate(
            { shopifyId: customerId },
            { $set: { followupStatus: newStatus } }
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error removing followup done:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
