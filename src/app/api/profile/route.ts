import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/profile  — update display name
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name: string = (body.name ?? "").trim();

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name || null },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json(updated);
}
