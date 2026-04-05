import { PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../src/lib/categorizer";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const password = await bcrypt.hash("demo1234", 12);

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@finbudget.app" },
    update: {},
    create: {
      email: "demo@finbudget.app",
      name: "Demo User",
      password,
      currency: "INR",
    },
  });

  console.log(`✓ User: ${user.email}`);

  // Upsert all default categories
  const createdCats: Record<string, string> = {};
  for (const cat of DEFAULT_CATEGORIES) {
    const slug = cat.name.toLowerCase().replace(/[\s&]+/g, "-").replace(/[^a-z0-9-]/g, "");
    const created = await prisma.category.upsert({
      where: { id: `seed-cat-${slug}` },
      update: { keywords: cat.keywords, color: cat.color, icon: cat.icon },
      create: {
        id: `seed-cat-${slug}`,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        keywords: cat.keywords,
        isDefault: true,
        userId: user.id,
      },
    });
    createdCats[cat.name] = created.id;
  }
  console.log(`✓ ${DEFAULT_CATEGORIES.length} categories`);

  // Generate sample transactions for last 3 months
  const now   = new Date();
  const transactions = [];

  for (let m = 0; m < 3; m++) {
    const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const yr    = month.getFullYear();
    const mo    = month.getMonth();

    const d = (day: number) => new Date(yr, mo, day);

    // ── INCOME ──────────────────────────────────────────────────────────────
    // Salary
    transactions.push({
      amount: 85000, description: "Monthly Salary — Accenture",
      type: "INCOME" as TransactionType,
      categoryId: createdCats["Salary"], date: d(1),
      isRecurring: true, recurringInterval: "monthly", userId: user.id,
    });

    // Freelance (only months 0 and 1)
    if (m < 2) {
      transactions.push({
        amount: m === 0 ? 22000 : 12000,
        description: m === 0 ? "Upwork — React project" : "Freelance — Logo design",
        type: "INCOME" as TransactionType,
        categoryId: createdCats["Freelance"], date: d(10),
        userId: user.id,
      });
    }

    // Bonus (only month 1)
    if (m === 1) {
      transactions.push({
        amount: 15000, description: "Q3 Performance Bonus",
        type: "INCOME" as TransactionType,
        categoryId: createdCats["Bonus"], date: d(5),
        userId: user.id,
      });
    }

    // Dividend / interest (every month)
    transactions.push({
      amount: m === 0 ? 1840 : m === 1 ? 2100 : 1650,
      description: "Groww — Dividend credit",
      type: "INCOME" as TransactionType,
      categoryId: createdCats["Dividends & Interest"], date: d(20),
      userId: user.id,
    });

    // Cashback (only month 0)
    if (m === 0) {
      transactions.push({
        amount: 320, description: "Amazon cashback credited",
        type: "INCOME" as TransactionType,
        categoryId: createdCats["Cashback & Refunds"], date: d(18),
        userId: user.id,
      });
    }

    // ── EXPENSES ────────────────────────────────────────────────────────────
    const expenses: Array<{
      amount: number; description: string; cat: string; day: number;
      recurring?: boolean;
    }> = [
      // Housing & Utilities
      { amount: 18000, description: "Monthly Rent — Koramangala flat",  cat: "Rent & Housing",      day: 1,  recurring: true },
      { amount: 1350,  description: "BESCOM electricity bill",          cat: "Utilities",            day: 14, recurring: true },
      { amount: 699,   description: "Jio broadband",                    cat: "Utilities",            day: 5,  recurring: true },
      { amount: 149,   description: "Tata Play DTH",                    cat: "Utilities",            day: 5,  recurring: true },

      // Food
      { amount: 2800,  description: "Zomato orders",                    cat: "Food & Dining",        day: 6  },
      { amount: 1600,  description: "Swiggy Instamart",                 cat: "Food & Dining",        day: 9  },
      { amount: 1950,  description: "BigBasket monthly groceries",      cat: "Food & Dining",        day: 16 },
      { amount: 680,   description: "Starbucks — team lunch",           cat: "Food & Dining",        day: 22 },
      { amount: 450,   description: "Chai Point office orders",         cat: "Food & Dining",        day: 11 },

      // Transport
      { amount: 1800,  description: "Uber rides",                       cat: "Transport",            day: 10 },
      { amount: 420,   description: "Metro card recharge",              cat: "Transport",            day: 2  },
      { amount: 2200,  description: "Petrol — HP pump",                 cat: "Transport",            day: 18 },

      // Shopping & Clothing
      { amount: 3200,  description: "Amazon — USB hub + headphones",    cat: "Shopping",             day: 12 },
      { amount: 2400,  description: "Myntra — kurta + jeans",           cat: "Clothing & Apparel",   day: 19 },
      { amount: 1800,  description: "Ajio — Nike shoes",                cat: "Clothing & Apparel",   day: 26 },

      // Entertainment
      { amount: 649,   description: "Netflix subscription",             cat: "Entertainment",        day: 3,  recurring: true },
      { amount: 219,   description: "Spotify Premium",                  cat: "Entertainment",        day: 3,  recurring: true },
      { amount: 1400,  description: "PVR Cinemas — weekend movie",      cat: "Entertainment",        day: 21 },

      // Health & Personal Care
      { amount: 2100,  description: "Apollo — doctor + medicines",      cat: "Health & Fitness",     day: 20 },
      { amount: 2499,  description: "Cult.fit membership",              cat: "Health & Fitness",     day: 1,  recurring: true },
      { amount: 850,   description: "Naturals salon — haircut + spa",   cat: "Personal Care",        day: 13 },
      { amount: 1200,  description: "Nykaa Beauty — skincare order",    cat: "Personal Care",        day: 24 },

      // Education & Investment
      { amount: 1999,  description: "Udemy — System Design course",     cat: "Education",            day: 25 },
      { amount: 10000, description: "SIP — Groww Mutual Fund",          cat: "Investment Returns",   day: 7,  recurring: true },

      // Insurance
      { amount: 2500,  description: "HDFC Life — term premium",         cat: "Insurance",            day: 8,  recurring: true },
      { amount: 1200,  description: "Star Health insurance premium",    cat: "Insurance",            day: 8,  recurring: true },

      // Home & Household
      { amount: 1800,  description: "Urban Company — deep cleaning",    cat: "Home & Household",     day: 15 },
    ];

    // Month-specific extras
    if (m === 0) {
      expenses.push(
        { amount: 8500,  description: "MakeMyTrip — Goa flight tickets",  cat: "Travel & Vacation",    day: 28 },
        { amount: 3200,  description: "OYO — hotel stay Goa",             cat: "Travel & Vacation",    day: 29 },
        { amount: 1200,  description: "Birthday gift — boAt headphones",  cat: "Gifts & Donations",    day: 17 },
        { amount: 2800,  description: "Decathlon — hiking shoes",         cat: "Clothing & Apparel",   day: 23 },
        { amount: 600,   description: "Drools dog food",                  cat: "Pets",                 day: 10 },
      );
    }
    if (m === 1) {
      expenses.push(
        { amount: 3400,  description: "Pepperfry — bedside table",        cat: "Home & Household",     day: 14 },
        { amount: 1500,  description: "Donation — CRY India",             cat: "Gifts & Donations",    day: 20 },
        { amount: 2200,  description: "Pub night — Toit Brewpub",         cat: "Alcohol & Nightlife",  day: 22 },
        { amount: 2700,  description: "Vet — pet vaccination",            cat: "Pets",                 day: 8  },
        { amount: 4500,  description: "AWS — personal project hosting",   cat: "Business Expenses",    day: 17 },
      );
    }
    if (m === 2) {
      expenses.push(
        { amount: 12000, description: "GoIbibo — Manali trip package",    cat: "Travel & Vacation",    day: 5  },
        { amount: 900,   description: "Temple offering + prasad",         cat: "Gifts & Donations",    day: 12 },
        { amount: 1800,  description: "Firstcry — baby products (gift)",  cat: "Kids & Family",        day: 18 },
        { amount: 1100,  description: "Bar Palate — team outing",         cat: "Alcohol & Nightlife",  day: 25 },
      );
    }

    for (const exp of expenses) {
      // Add small random variation (+/- 3%) for realism
      const variation = 1 + (Math.random() * 0.06 - 0.03);
      transactions.push({
        amount: Math.round(exp.amount * variation),
        description: exp.description,
        type: "EXPENSE" as TransactionType,
        categoryId: createdCats[exp.cat],
        date: d(exp.day),
        isRecurring: exp.recurring ?? false,
        recurringInterval: exp.recurring ? "monthly" : undefined,
        userId: user.id,
      });
    }
  }

  // Bulk insert
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.createMany({ data: transactions });
  console.log(`✓ ${transactions.length} transactions`);

  // Budgets for current month
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const budgets = [
    { cat: "Food & Dining",      amount: 9000  },
    { cat: "Transport",          amount: 5000  },
    { cat: "Shopping",           amount: 5000  },
    { cat: "Clothing & Apparel", amount: 4000  },
    { cat: "Entertainment",      amount: 2000  },
    { cat: "Health & Fitness",   amount: 4000  },
    { cat: "Personal Care",      amount: 2000  },
    { cat: "Utilities",          amount: 3000  },
    { cat: "Education",          amount: 3000  },
    { cat: "Travel & Vacation",  amount: 15000 },
    { cat: "Home & Household",   amount: 3000  },
    { cat: "Insurance",          amount: 4000  },
  ];

  for (const b of budgets) {
    if (!createdCats[b.cat]) continue;
    await prisma.budget.upsert({
      where: {
        categoryId_userId_month_year: {
          categoryId: createdCats[b.cat],
          userId: user.id,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {},
      create: {
        amount: b.amount,
        categoryId: createdCats[b.cat],
        userId: user.id,
        month: currentMonth,
        year: currentYear,
      },
    });
  }
  console.log(`✓ ${budgets.length} budgets`);

  // Goals
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.goal.createMany({
    data: [
      {
        name: "Emergency Fund",
        targetAmount: 300000, currentAmount: 140000,
        color: "#22c55e", icon: "shield", userId: user.id,
      },
      {
        name: "New MacBook Pro",
        targetAmount: 180000, currentAmount: 72000,
        color: "#3b82f6", icon: "laptop", userId: user.id,
        deadline: new Date(2026, 8, 30),
      },
      {
        name: "Vacation — Europe Trip",
        targetAmount: 200000, currentAmount: 55000,
        color: "#f97316", icon: "plane", userId: user.id,
        deadline: new Date(2027, 2, 31),
      },
      {
        name: "Investment Corpus",
        targetAmount: 1000000, currentAmount: 285000,
        color: "#6366f1", icon: "trending-up", userId: user.id,
      },
      {
        name: "Car Down Payment",
        targetAmount: 250000, currentAmount: 90000,
        color: "#ec4899", icon: "car", userId: user.id,
        deadline: new Date(2026, 11, 31),
      },
    ],
  });
  console.log("✓ 5 goals");

  console.log("\n✅ Seed complete!");
  console.log(`   Categories: ${DEFAULT_CATEGORIES.length}`);
  console.log(`   Transactions: ${transactions.length}`);
  console.log("   Email:    demo@finbudget.app");
  console.log("   Password: demo1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
