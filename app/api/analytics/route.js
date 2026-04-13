import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Return from "@/app/models/Return";
import CancelledOrder from "@/app/models/CancelledOrder";
import Customer from "@/app/models/Customer";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // 1-12
    const year = searchParams.get("year");

    await dbConnect();

    let startDate, endDate;

    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date();
    }

    // 1. Returns Analytics
    const returnsStats = await Return.aggregate([
      { $match: { returnCreatedAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalValue: { $sum: "$order.totalPrice" },
        },
      },
    ]);

    // 2. Cancelled Orders Analytics
    const cancelledStats = await CancelledOrder.aggregate([
      { $match: { cancelledAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalValue: { $sum: "$totalPrice" },
        },
      },
    ]);



    // 3. Customer Status Analytics
    const customerStats = await Customer.aggregate([
      {
        $group: {
          _id: "$followupStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // 4. Recent activity (last 5 returns and last 5 cancelled)
    const recentReturns = await Return.find({}).sort({ returnCreatedAt: -1 }).limit(5).lean();
    const recentCancelled = await CancelledOrder.find({}).sort({ cancelledAt: -1 }).limit(5).lean();

    const stats = {
      returns: {
        count: returnsStats[0]?.totalCount || 0,
        value: returnsStats[0]?.totalValue || 0,
      },
      cancelled: {
        count: cancelledStats[0]?.totalCount || 0,
        value: cancelledStats[0]?.totalValue || 0,
      },
      customers: {
        overdue: customerStats.find(s => s._id === "overdue")?.count || 0,
        dueToday: customerStats.find(s => s._id === "due-today")?.count || 0,
        upcoming: customerStats.find(s => s._id === "upcoming")?.count || 0,
        completed: customerStats.find(s => s._id === "done")?.count || 0,
      },
      recent: {
        returns: recentReturns,
        cancelled: recentCancelled,
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
