import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

// GET /api/export — download CSV of transactions
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  });

  // Build CSV content
  const header = ["Date", "Description", "Type", "Category", "Amount", "Notes", "Recurring"].join(",");
  const rows = transactions.map((t) =>
    [
      format(new Date(t.date), "yyyy-MM-dd"),
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      t.category?.name ?? "Uncategorized",
      t.amount.toFixed(2),
      `"${(t.notes ?? "").replace(/"/g, '""')}"`,
      t.isRecurring ? t.recurringInterval ?? "yes" : "no",
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="finbudget-export-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
