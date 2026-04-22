import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/transactions/check-duplicate
// Body: { amount, type, date }
// Returns: { duplicate: Transaction | null }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, type, date } = await req.json();
  if (!amount || !type || !date) {
    return NextResponse.json({ duplicate: null });
  }

  // Check ±1 day window with exact amount and type
  const base = new Date(date);
  const from = new Date(base); from.setDate(from.getDate() - 1);
  const to   = new Date(base); to.setDate(to.getDate()   + 1);

  const existing = await prisma.transaction.findFirst({
    where: {
      userId: session.user.id,
      amount: parseFloat(amount),
      type,
      date: { gte: from, lte: to },
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ duplicate: existing ?? null });
}
