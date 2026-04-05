import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Advance a date by the given recurring interval, clamping to valid month-end days. */
function advanceDate(date: Date, interval: string): Date {
  const d = new Date(date);
  const origDay = date.getDate();

  switch (interval) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly": {
      d.setMonth(d.getMonth() + 1, 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(origDay, last));
      break;
    }
    case "quarterly": {
      d.setMonth(d.getMonth() + 3, 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(origDay, last));
      break;
    }
    case "yearly": {
      const origMonth = date.getMonth();
      d.setFullYear(d.getFullYear() + 1, origMonth, 1);
      const last = new Date(d.getFullYear(), origMonth + 1, 0).getDate();
      d.setDate(Math.min(origDay, last));
      break;
    }
  }
  return d;
}

// POST /api/recurring/process
// Scans all recurring transactions for the user and auto-creates any that are due
// but haven't been posted yet. Safe to call on every dashboard load — idempotent.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const recurringTxns = await prisma.transaction.findMany({
    where: { userId, isRecurring: true },
    orderBy: { date: "desc" },
  });

  if (recurringTxns.length === 0) {
    return NextResponse.json({ created: 0, transactions: [] });
  }

  // Group by series key, keeping the most recent date per series
  const seriesMap = new Map<string, typeof recurringTxns[0]>();
  for (const txn of recurringTxns) {
    const key = `${txn.description.toLowerCase().trim()}|${txn.categoryId ?? ""}|${txn.type}`;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, txn); // already sorted desc — first = most recent
    }
  }

  // End of today
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const created: Array<{ description: string; amount: number; date: string; type: string }> = [];

  for (const head of Array.from(seriesMap.values())) {
    if (!head.recurringInterval) continue;

    let nextDue = advanceDate(new Date(head.date), head.recurringInterval);
    let safety = 0;

    while (nextDue <= todayEnd && safety < 24) {
      safety++;

      // Deduplicate: don't create if a matching transaction already exists that day
      const dayStart = new Date(nextDue); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(nextDue); dayEnd.setHours(23, 59, 59, 999);

      const exists = await prisma.transaction.findFirst({
        where: {
          userId,
          description: { equals: head.description, mode: "insensitive" },
          type: head.type,
          date: { gte: dayStart, lte: dayEnd },
        },
      });

      if (!exists) {
        const newTxn = await prisma.transaction.create({
          data: {
            amount: head.amount,
            description: head.description,
            type: head.type,
            categoryId: head.categoryId,
            date: new Date(nextDue),
            isRecurring: true,
            recurringInterval: head.recurringInterval,
            notes: head.notes ? `Auto-posted (recurring) — ${head.notes}` : "Auto-posted (recurring)",
            userId,
          },
        });
        created.push({
          description: newTxn.description,
          amount: newTxn.amount,
          date: newTxn.date.toISOString(),
          type: newTxn.type,
        });
      }

      nextDue = advanceDate(new Date(nextDue), head.recurringInterval);
    }
  }

  return NextResponse.json({ created: created.length, transactions: created });
}
