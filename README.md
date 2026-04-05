<p align="center">
  <img src="public/logo/logo-horizontal.svg" alt="FinBudget" height="48" />
</p>

<p align="center">
  A full-featured personal finance tracker built with Next.js 14, PostgreSQL and Tailwind CSS.
  <br />
  Track income & expenses · Set budgets · Monitor goals · Import bank statements · PWA-ready
</p>

---

## Features

- **Dashboard** — animated stats, spending charts, smart insights, budget alerts
- **Transactions** — add, edit, delete, search, filter, CSV export, bulk bank statement import
- **26 categories** with 350+ keyword auto-detection (Indian banks & merchants)
- **Budgets** — monthly limits with colour-coded progress bars
- **Goals** — savings targets with deadline tracking
- **Analytics** — monthly trend, category breakdown, historical comparison
- **Recurring transactions** — mark any transaction as recurring; auto-posted on next login
- **Onboarding wizard** — 3-step setup for new users (income → recurring → budgets)
- **Dark mode** — full dark/light toggle
- **PWA** — installable on iOS & Android

---

## Tech Stack

| Layer       | Technology |
|-------------|-----------|
| Framework   | Next.js 14 (App Router) |
| Database    | PostgreSQL via [Neon](https://neon.tech) (free tier) |
| ORM         | Prisma 5 |
| Auth        | NextAuth v4 (Credentials + JWT) |
| Styling     | Tailwind CSS v3 |
| Charts      | Recharts |
| PWA         | @ducanh2912/next-pwa + Workbox |
| Deployment  | Vercel (free tier) |

---

## Deploy Your Own Instance

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [Vercel account](https://vercel.com) (free)
- [Neon account](https://neon.tech) (free) — or any PostgreSQL provider

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/finbudget.git
cd finbudget
npm install
```

### 2. Set up the database

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the **connection string** from the Neon dashboard

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://..."   # your Neon connection string
NEXTAUTH_SECRET="..."             # run: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Run database migrations & seed

```bash
npx prisma db push
npx ts-node --project tsconfig.seed.json prisma/seed.ts
```

### 5. Start locally

```bash
npm run dev
# open http://localhost:3000
```

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

When prompted, add these environment variables in the Vercel dashboard (or via CLI):

```bash
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL   # set to https://your-app.vercel.app
```

---

## Local Development

```bash
npm run dev          # start dev server on :3000
npx prisma studio    # open database GUI
npm run build        # production build
```

---

## Demo account

After seeding, a demo account is available:

| Field    | Value               |
|----------|---------------------|
| Email    | demo@finbudget.app  |
| Password | demo1234            |

---

## Project Structure

```
finbudget/
├── prisma/
│   ├── schema.prisma        # DB models
│   └── seed.ts              # Demo data
├── public/
│   ├── logo/                # SVG logo variants
│   └── icons/               # PWA icons
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login & signup pages
│   │   ├── (dashboard)/     # All dashboard pages
│   │   └── api/             # API routes
│   ├── components/          # UI components
│   ├── lib/                 # Utilities (auth, prisma, categorizer)
│   └── types/               # TypeScript types
└── .env.example             # Environment variable template
```

---

## Licence

MIT — free to use, modify and deploy for personal use.
