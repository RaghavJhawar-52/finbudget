import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/goals/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.goal.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, targetAmount, currentAmount, deadline, color, icon } = await req.json();

  const updated = await prisma.goal.update({
    where: { id: params.id },
    data: {
      ...(name          !== undefined && { name }),
      ...(targetAmount  !== undefined && { targetAmount: parseFloat(targetAmount) }),
      ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
      ...(deadline      !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      ...(color         !== undefined && { color }),
      ...(icon          !== undefined && { icon }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/goals/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.goal.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.goal.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
