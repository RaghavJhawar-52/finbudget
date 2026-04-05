/**
 * One-time migration: re-categorize transactions that are in "Food & Dining"
 * but actually belong to the new "Groceries" category.
 *
 * Run with:
 *   npx ts-node --project tsconfig.seed.json prisma/recategorize-groceries.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Keywords that identify a transaction as grocery (not dining)
const GROCERY_KEYWORDS = [
  "bigbasket", "blinkit", "zepto", "instamart", "jiomart grocery",
  "grofers", "milkbasket", "dunzo grocery", "dmart", "reliance fresh",
  "more supermarket", "nature basket", "star bazaar", "spencers",
  "easy day", "big bazaar grocery", "lulu hypermarket",
  "handpickd", "country delight", "sid farm", "fresh to home",
  "licious", "tender cuts", "nandu", "zappfresh", "farmley",
  "organic world", "organic india", "milky mist",
  "grocery", "groceries", "supermarket", "hypermarket", "kirana",
  "provision store", "weekly groceries", "monthly groceries",
];

async function main() {
  console.log("🔄 Re-categorizing grocery transactions for all users...\n");

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Found ${users.length} user(s)\n`);

  let totalUpdated = 0;

  for (const user of users) {
    // Find the user's Food & Dining and Groceries categories
    const foodCat = await prisma.category.findFirst({
      where: { userId: user.id, name: { equals: "Food & Dining", mode: "insensitive" } },
    });
    const groceryCat = await prisma.category.findFirst({
      where: { userId: user.id, name: { equals: "Groceries", mode: "insensitive" } },
    });

    if (!foodCat) {
      console.log(`⚠  ${user.email} — no "Food & Dining" category found, skipping`);
      continue;
    }
    if (!groceryCat) {
      console.log(`⚠  ${user.email} — no "Groceries" category found (run migrate-categories first), skipping`);
      continue;
    }

    // Fetch all Food & Dining transactions for this user
    const foodTxns = await prisma.transaction.findMany({
      where: { userId: user.id, categoryId: foodCat.id },
      select: { id: true, description: true },
    });

    const toUpdate = foodTxns.filter((txn) => {
      const lower = txn.description.toLowerCase();
      return GROCERY_KEYWORDS.some((kw) => lower.includes(kw));
    });

    if (toUpdate.length === 0) {
      console.log(`✓ ${user.email} — no grocery transactions to move`);
      continue;
    }

    await prisma.transaction.updateMany({
      where: { id: { in: toUpdate.map((t) => t.id) } },
      data: { categoryId: groceryCat.id },
    });

    totalUpdated += toUpdate.length;
    console.log(
      `✓ ${user.email} — moved ${toUpdate.length} transaction(s) to Groceries:\n` +
      toUpdate.map((t) => `     • ${t.description}`).join("\n")
    );
  }

  console.log(`\n✅ Done. ${totalUpdated} transaction(s) re-categorized across ${users.length} user(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
