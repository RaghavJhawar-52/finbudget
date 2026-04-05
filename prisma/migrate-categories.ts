/**
 * One-time migration: backfill all existing users with any missing default categories.
 * Safe to re-run — uses skipDuplicates and name-based matching.
 *
 * Run with:
 *   npx ts-node --project tsconfig.seed.json prisma/migrate-categories.ts
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "../src/lib/categorizer";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Migrating categories for all existing users...\n");

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Found ${users.length} user(s)\n`);

  let totalAdded = 0;

  for (const user of users) {
    const existing = await prisma.category.findMany({
      where: { userId: user.id },
      select: { name: true },
    });

    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

    const missing = DEFAULT_CATEGORIES.filter(
      (def) => !existingNames.has(def.name.toLowerCase())
    );

    if (missing.length === 0) {
      console.log(`✓ ${user.email} — already has all ${existing.length} categories`);
      continue;
    }

    await prisma.category.createMany({
      data: missing.map((cat) => ({
        ...cat,
        isDefault: true,
        userId: user.id,
      })),
      skipDuplicates: true,
    });

    totalAdded += missing.length;
    console.log(
      `✓ ${user.email} — added ${missing.length} new: ` +
      missing.map((c) => c.name).join(", ")
    );
  }

  console.log(`\n✅ Done. ${totalAdded} categories added across ${users.length} user(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
