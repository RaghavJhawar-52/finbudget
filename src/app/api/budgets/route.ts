import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/budgets?month=4&year=2026
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
  const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id, month, year },
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  });

  // Compute spent amount for each budget
  const enriched = await Promise.all(
    budgets.map(async (budget) => {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0, 23, 59, 59);

      const agg = await prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          categoryId: budget.categoryId,
          type: "EXPENSE",
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });

      return { ...budget, spent: agg._sum.amount ?? 0 };
    })
  );

  return NextResponse.json(enriched);
}

// POST /api/budgets
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { amount, categoryId, month, year } = await req.json();

    if (!amount || !categoryId || !month || !year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: session.user.id },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    // Upsert budget (update if exists for same category/month/year)
    const budget = await prisma.budget.upsert({
      where: { categoryId_userId_month_year: { categoryId, userId: session.user.id, month, year } },
      update: { amount: parseFloat(amount) },
      create: { amount: parseFloat(amount), categoryId, userId: session.user.id, month, year },
      include: { category: true },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}
