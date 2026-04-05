import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoCategorizeId } from "@/lib/categorizer";

// GET /api/transactions — list with optional filters
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type      = searchParams.get("type");        // INCOME | EXPENSE
  const category  = searchParams.get("category");    // categoryId
  const from      = searchParams.get("from");        // ISO date
  const to        = searchParams.get("to");          // ISO date
  const search    = searchParams.get("search");      // text search
  const page      = parseInt(searchParams.get("page") ?? "1");
  const limit     = parseInt(searchParams.get("limit") ?? "50");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (type)     where.type = type;
  if (category) where.categoryId = category;
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }
  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, page, limit });
}

// POST /api/transactions — create new transaction
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, description, type, categoryId, date, isRecurring, recurringInterval, notes } = body;

    if (!amount || !description || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Auto-categorize if no category provided
    let resolvedCategoryId = categoryId || null;
    if (!resolvedCategoryId) {
      const userCategories = await prisma.category.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true, keywords: true },
      });
      resolvedCategoryId = autoCategorizeId(description, userCategories);
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description,
        type,
        categoryId: resolvedCategoryId,
        userId: session.user.id,
        date: date ? new Date(date) : new Date(),
        isRecurring: isRecurring ?? false,
        recurringInterval: isRecurring ? recurringInterval : null,
        notes: notes || null,
      },
      include: { category: true },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
