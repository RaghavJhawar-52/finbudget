import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/import/confirm — bulk-insert confirmed import rows
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await req.json() as {
    rows: Array<{
      date: string;
      description: string;
      amount: number;
      type: "INCOME" | "EXPENSE";
      categoryId?: string | null;
    }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const userId = session.user.id;

  // De-duplicate: for each row check if a matching transaction (same user,
  // description, amount, type, and date) already exists.
  const toInsert = [];
  for (const r of rows) {
    const date = new Date(r.date);
    // Build a ±1 day window — bank statement dates are sometimes off by a day
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.transaction.findFirst({
      where: {
        userId,
        description: { equals: r.description.trim(), mode: "insensitive" },
        amount:      Math.round(r.amount * 100) / 100,
        type:        r.type,
        date:        { gte: dayStart, lte: dayEnd },
      },
      select: { id: true },
    });

    if (!existing) {
      toInsert.push({
        date,
        description: r.description.trim(),
        amount:      Math.round(r.amount * 100) / 100,
        type:        r.type,
        categoryId:  r.categoryId || null,
        userId,
        isRecurring: false,
        notes:       "Imported from bank statement",
      });
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: rows.length });
  }

  const result = await prisma.transaction.createMany({ data: toInsert, skipDuplicates: false });
  return NextResponse.json({ imported: result.count, skipped: rows.length - result.count });
}
