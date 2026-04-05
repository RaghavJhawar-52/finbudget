import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/categorizer";

// GET /api/categories
// Also auto-syncs any missing default categories for the current user so that
// existing accounts always receive new categories added after their sign-up.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Fetch the user's existing categories
  const existing = await prisma.category.findMany({
    where: { userId },
    select: { name: true },
  });

  const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

  // Find any default categories the user doesn't have yet
  const missing = DEFAULT_CATEGORIES.filter(
    (def) => !existingNames.has(def.name.toLowerCase())
  );

  // Create the missing ones (silent — user never notices)
  if (missing.length > 0) {
    await prisma.category.createMany({
      data: missing.map((cat) => ({
        ...cat,
        isDefault: true,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  // Return the full (now up-to-date) list
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

// POST /api/categories
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, icon, color, keywords } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const category = await prisma.category.create({
      data: {
        name,
        icon: icon || "tag",
        color: color || "#6366f1",
        keywords: keywords ?? [],
        userId: session.user.id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
