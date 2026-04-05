import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoCategorizeName } from "@/lib/categorizer";

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(raw: string): string[][] {
  // Strip UTF-8 BOM if present
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQuote && content[i + 1] === '"') { field += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      row.push(field.trim()); field = "";
    } else if ((c === '\n' || c === '\r') && !inQuote) {
      if (c === '\r' && content[i + 1] === '\n') i++;
      row.push(field.trim()); field = "";
      if (row.some(f => f !== "")) rows.push([...row]);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field.trim());
  if (row.some(f => f !== "")) rows.push(row);
  return rows;
}

// ─── Date Parser ─────────────────────────────────────────────────────────────
function parseDate(s: string): Date | null {
  s = s.trim().replace(/\s+/g, " ");
  let m: RegExpMatchArray | null;

  // DD/MM/YYYY or DD/MM/YY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(y, +m[2] - 1, +m[1]);
  }
  // DD-MM-YYYY or DD-MM-YY
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(y, +m[2] - 1, +m[1]);
  }
  // DD MMM YYYY  (01 Jan 2024)
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (m) {
    const months: Record<string, number> = {
      jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
    };
    const mon = months[m[2].toLowerCase().slice(0, 3)];
    if (mon !== undefined) return new Date(+m[3], mon, +m[1]);
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  return null;
}

function parseAmount(s: string): number {
  const n = parseFloat(s.replace(/[₹$£€,\s()]/g, ""));
  return isNaN(n) ? 0 : Math.abs(n);
}

// ─── Column finder ────────────────────────────────────────────────────────────
function findCol(headers: string[], candidates: string[]): number {
  const h = headers.map(x => x.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim());
  for (const c of candidates) {
    const idx = h.findIndex(x => x === c || x.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

// ─── Bank Detection & Column Maps ────────────────────────────────────────────
type ColMap = { date: string[]; desc: string[]; debit: string[]; credit: string[] };

const BANK_MAPS: Record<string, ColMap> = {
  HDFC:    { date: ["date"],              desc: ["narration"],            debit: ["debit amount"],           credit: ["credit amount"] },
  ICICI:   { date: ["transaction date"],  desc: ["transaction remarks"],  debit: ["amount inrdr", "withdrawal amount"], credit: ["amount inrcr", "deposit amount"] },
  SBI:     { date: ["txn date"],          desc: ["description"],          debit: ["debit"],                  credit: ["credit"] },
  Axis:    { date: ["tran date", "date"], desc: ["particulars"],          debit: ["dr", "debit"],            credit: ["cr", "credit"] },
  Kotak:   { date: ["value date", "date"],desc: ["description","narration"], debit: ["withdrawal amt","debit"], credit: ["deposit amt","credit"] },
  Generic: {
    date:   ["date","txn date","transaction date","value date","trans date","posting date","tran date"],
    desc:   ["description","narration","particulars","transaction details","remarks","details","transaction remarks","chequeno narration"],
    debit:  ["debit","dr","withdrawal","debit amount","withdrawal amount","debit amt","amount dr"],
    credit: ["credit","cr","deposit","credit amount","deposit amount","credit amt","amount cr"],
  },
};

function detectBank(headers: string[]): string {
  const h = headers.map(x => x.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim());
  if (h.some(x => x.includes("narration")) && h.some(x => x.includes("debit amount"))) return "HDFC";
  if (h.some(x => x.includes("transaction remarks"))) return "ICICI";
  if (h.some(x => x === "txn date") && h.some(x => x === "description")) return "SBI";
  if (h.some(x => x === "particulars")) return "Axis";
  if (h.some(x => x.includes("tran date"))) return "Axis";
  if (h.some(x => x.includes("withdrawal amt"))) return "Kotak";
  return "Generic";
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let content: string;
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    content = await file.text();
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  const allRows = parseCSV(content);
  if (allRows.length < 2) {
    return NextResponse.json({ error: "File appears empty or unreadable" }, { status: 422 });
  }

  // Find header row — first row where ≥2 fields match known header keywords
  const headerKeywords = ["date","narration","description","debit","credit","amount","balance","particulars","remarks","withdrawal","deposit","tran"];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(15, allRows.length); i++) {
    const matches = allRows[i].filter(f =>
      headerKeywords.some(k => f.toLowerCase().includes(k))
    ).length;
    if (matches >= 2) { headerIdx = i; break; }
  }

  const headers  = allRows[headerIdx];
  const dataRows = allRows.slice(headerIdx + 1);
  const bank     = detectBank(headers);
  const map      = BANK_MAPS[bank] ?? BANK_MAPS.Generic;

  const dateIdx   = findCol(headers, map.date);
  const descIdx   = findCol(headers, map.desc);
  const debitIdx  = findCol(headers, map.debit);
  const creditIdx = findCol(headers, map.credit);

  if (dateIdx === -1 || descIdx === -1) {
    return NextResponse.json({
      error: "Could not detect Date and Description columns. Please check the file format or select your bank manually.",
      bank, headers,
    }, { status: 422 });
  }

  // Fetch user's categories for auto-categorization
  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, keywords: true },
  });

  type ImportRow = {
    id: string; rawDate: string; date: string;
    description: string; amount: number;
    type: "INCOME" | "EXPENSE";
    suggestedCategoryId: string | null;
    suggestedCategoryName: string | null;
  };

  const parsed: ImportRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rawDate    = (row[dateIdx] ?? "").trim();
    const description = (row[descIdx] ?? "").trim();
    if (!rawDate || !description) continue;

    const parsedDate = parseDate(rawDate);
    if (!parsedDate || isNaN(parsedDate.getTime())) continue;

    const debit  = debitIdx  !== -1 ? parseAmount(row[debitIdx]  ?? "") : 0;
    const credit = creditIdx !== -1 ? parseAmount(row[creditIdx] ?? "") : 0;

    let amount: number, type: "INCOME" | "EXPENSE";
    if (debit > 0 && credit === 0)       { amount = debit;  type = "EXPENSE"; }
    else if (credit > 0 && debit === 0)  { amount = credit; type = "INCOME";  }
    else if (debit > 0)                  { amount = debit;  type = "EXPENSE"; }
    else if (credit > 0)                 { amount = credit; type = "INCOME";  }
    else continue; // no usable amount

    const matchedName = autoCategorizeName(description, categories);
    const matchedCat  = matchedName
      ? categories.find(c => c.name.toLowerCase() === matchedName.toLowerCase())
      : null;

    parsed.push({
      id: `row-${i}`,
      rawDate,
      date: `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2,"0")}-${String(parsedDate.getDate()).padStart(2,"0")}`,
      description,
      amount,
      type,
      suggestedCategoryId:   matchedCat?.id   ?? null,
      suggestedCategoryName: matchedCat?.name ?? null,
    });
  }

  return NextResponse.json({ bank, rows: parsed, totalRows: dataRows.length });
}
