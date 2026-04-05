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

  const data = rows.map((r) => ({
    date:        new Date(r.date),
    description: r.description.trim(),
    amount:      Math.round(r.amount * 100) / 100,
    type:        r.type,
    categoryId:  r.categoryId || null,
    userId:      session.user.id,
    isRecurring: false,
    notes:       "Imported from bank statement",
  }));

  const result = await prisma.transaction.createMany({ data, skipDuplicates: false });
  return NextResponse.json({ imported: result.count });
}
