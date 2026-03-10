import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function POST(request, { params }) {
  try {
    const p = await params;
    const customerId = p.customerId;
    const db = await readDb();
    db[customerId] = "done";
    await writeDb(db);
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
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error removing followup done:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
