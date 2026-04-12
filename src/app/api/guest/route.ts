import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/categorizer";

// POST /api/guest — create a fresh guest account and return credentials for auto sign-in
export async function POST() {
  try {
    const uid      = crypto.randomUUID().slice(0, 8);
    const email    = `guest-${uid}@finbudget.app`;
    const password = crypto.randomUUID(); // random, never shown to user
    const hashed   = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name: "Guest",
        email,
        password: hashed,
        categories: {
          create: DEFAULT_CATEGORIES.map((cat) => ({ ...cat, isDefault: true })),
        },
      },
    });

    // Silently clean up guest accounts older than 30 days to keep the DB tidy.
    // Cascades handle categories, transactions, budgets, goals automatically.
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.user.deleteMany({
      where: {
        email: { startsWith: "guest-", endsWith: "@finbudget.app" },
        createdAt: { lt: cutoff },
      },
    }).catch(() => {}); // non-critical — don't fail the request if this errors

    // Return plain-text password so the client can call signIn immediately
    return NextResponse.json({ email, password }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create guest session" }, { status: 500 });
  }
}
