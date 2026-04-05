import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/categories/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.category.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, icon, color, keywords } = await req.json();

  const updated = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(name     !== undefined && { name }),
      ...(icon     !== undefined && { icon }),
      ...(color    !== undefined && { color }),
      ...(keywords !== undefined && { keywords }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/categories/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.category.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
