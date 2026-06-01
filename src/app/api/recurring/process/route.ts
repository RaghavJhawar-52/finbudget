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

type DueTransaction = {
  description: string;
  amount: number;
  date: string;
  type: string;
  categoryId: string | null;
  recurringInterval: string;
  notes: string | null;
};

/** Compute which recurring transactions are due but not yet posted (shared by GET and POST). */
async function computeDue(userId: string): Promise<DueTransaction[]> {
  const recurringTxns = await prisma.transaction.findMany({
    where: { userId, isRecurring: true },
    orderBy: { date: "desc" },
  });

  if (recurringTxns.length === 0) return [];

  // Group by series key, keeping the most recent date per series
  const seriesMap = new Map<string, typeof recurringTxns[0]>();
  for (const txn of recurringTxns) {
    const key = `${txn.description.toLowerCase().trim()}|${txn.categoryId ?? ""}|${txn.type}`;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, txn);
    }
  }

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const due: DueTransaction[] = [];

  for (const head of Array.from(seriesMap.values())) {
    if (!head.recurringInterval) continue;

    let nextDue = advanceDate(new Date(head.date), head.recurringInterval);
    let safety = 0;

    while (nextDue <= todayEnd && safety < 24) {
      safety++;

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
        due.push({
          description: head.description,
          amount: head.amount,
          date: new Date(nextDue).toISOString(),
          type: head.type,
          categoryId: head.categoryId,
          recurringInterval: head.recurringInterval,
          notes: head.notes,
        });
      }

      nextDue = advanceDate(new Date(nextDue), head.recurringInterval);
    }
  }

  return due;
}

// GET /api/recurring/process
// Dry-run: returns which recurring transactions are due but NOT yet posted.
// Does not create anything. Used to prompt the user before they decide to post.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const due = await computeDue(session.user.id);
  return NextResponse.json({ due: due.length, transactions: due });
}

// POST /api/recurring/process
// Manually triggered by the user: creates all due recurring transactions.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const due = await computeDue(userId);

  if (due.length === 0) {
    return NextResponse.json({ created: 0, transactions: [] });
  }

  const created: Array<{ description: string; amount: number; date: string; type: string }> = [];

  for (const item of due) {
    const newTxn = await prisma.transaction.create({
      data: {
        amount: item.amount,
        description: item.description,
        type: item.type as "INCOME" | "EXPENSE",
        categoryId: item.categoryId,
        date: new Date(item.date),
        isRecurring: true,
        recurringInterval: item.recurringInterval,
        notes: item.notes ? `${item.notes}` : null,
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

  return NextResponse.json({ created: created.length, transactions: created });
}
