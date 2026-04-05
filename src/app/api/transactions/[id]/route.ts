import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/transactions/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { category: true },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(transaction);
}

// PUT /api/transactions/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, description, type, categoryId, date, isRecurring, recurringInterval, notes } = body;

    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        ...(amount      !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(type        !== undefined && { type }),
        ...(categoryId  !== undefined && { categoryId: categoryId || null }),
        ...(date        !== undefined && { date: new Date(date) }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurringInterval !== undefined && { recurringInterval: isRecurring ? recurringInterval : null }),
        ...(notes       !== undefined && { notes: notes || null }),
      },
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE /api/transactions/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.transaction.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
