/**
 * Indian bank SMS parser
 * Extracts: amount, type (INCOME/EXPENSE), description, date, bank name
 * Handles: HDFC, ICICI, SBI, Axis, Kotak, generic UPI
 */

export interface ParsedSms {
  amount:      number;
  type:        "INCOME" | "EXPENSE";
  description: string;
  date:        string;   // ISO yyyy-MM-dd
  bank:        string;
  confidence:  "high" | "medium" | "low";
}

const MONTH: Record<string, number> = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
};

function parseDate(text: string): string {
  const today = new Date();
  let d: Date | null = null;

  // DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY or DD/MM/YY
  let m = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    d = new Date(y, +m[2] - 1, +m[1]);
  }

  // DD-MMM-YY or DD MMM YYYY  (22-Apr-26 or 22 Apr 2026)
  if (!d) {
    m = text.match(/(\d{1,2})[\s\-]?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\-]?(\d{2,4})/i);
    if (m) {
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      d = new Date(y, MONTH[m[2].toLowerCase()], +m[1]);
    }
  }

  if (!d || isNaN(d.getTime())) d = today;

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAmount(text: string): number | null {
  // Match Rs. / INR / ₹ followed by amount (with optional commas)
  const m = text.match(/(?:Rs\.?\s*|INR\s*|₹\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(n) || n <= 0 ? null : n;
}

function extractDescription(text: string): string {
  // Priority order: UPI merchant > Info: field > Merchant: field > VPA > fallback

  // "Info: SWIGGY FOOD" or "Info:SWIGGY/1234"  (HDFC style)
  let m = text.match(/\bInfo[:\s]+([^\n.]+)/i);
  if (m) {
    // Take the first meaningful segment before "/" or "-"
    const seg = m[1].trim().split(/\s*[\/|]\s*/)[0].replace(/\d{6,}/g, "").trim();
    if (seg.length >= 2) return cleanDesc(seg);
  }

  // "Merchant: AMAZON" or "at AMAZON" (Axis / generic)
  m = text.match(/(?:Merchant|at)[:\s]+([A-Z][A-Za-z0-9 &.\-_]+?)(?=\s*\.|$|\s+on\s|\s+Ref|\s+UPI)/i);
  if (m) return cleanDesc(m[1]);

  // UPI VPA like swiggy@hdfcbank
  m = text.match(/\b([a-zA-Z][a-zA-Z0-9._-]{1,20}@[a-zA-Z]{2,20})\b/);
  if (m) return m[1];

  // "to VPA XXXXX" or "to XXXX"
  m = text.match(/\bto\s+([A-Z][A-Za-z0-9 &.\-_]{2,30})(?=\s*[.\n]|\s+on\s|$)/i);
  if (m) return cleanDesc(m[1]);

  // "NEFT from/by ABC CORP"
  m = text.match(/\bNEFT[- ]*(?:from|by|credit)[:\s]+([A-Z][A-Za-z0-9 &.\-_]+?)(?=\s*\.|$)/i);
  if (m) return cleanDesc(m[1]);

  return "";
}

function cleanDesc(s: string): string {
  return s.replace(/\b\d{6,}\b/g, "").replace(/\s+/g, " ").trim();
}

function detectBank(text: string): string {
  const t = text.toLowerCase();
  if (/\bhdfc\b/.test(t))          return "HDFC";
  if (/\bicici\b/.test(t))         return "ICICI";
  if (/\bsbi\b|state bank/.test(t)) return "SBI";
  if (/\baxis\b/.test(t))          return "Axis";
  if (/\bkotak\b/.test(t))         return "Kotak";
  if (/\byes ?bank\b/.test(t))     return "Yes Bank";
  if (/\bpnb\b|punjab national/.test(t)) return "PNB";
  if (/\bbofa\b|bank of america/.test(t)) return "BofA";
  if (/\bupi\b/.test(t))           return "UPI";
  return "Bank";
}

export function parseSms(raw: string): ParsedSms | null {
  const text = raw.trim();
  if (text.length < 10) return null;

  const amount = parseAmount(text);
  if (!amount) return null;

  // Type detection
  const lc = text.toLowerCase();
  const debitWords  = /\b(debited|debit|spent|withdrawn|purchase|payment made|dr\b|charged)\b/;
  const creditWords = /\b(credited|credit|received|deposited|refund|cashback|cr\b)\b/;
  const isDebit  = debitWords.test(lc);
  const isCredit = creditWords.test(lc);

  let type: "INCOME" | "EXPENSE";
  if (isCredit && !isDebit) type = "INCOME";
  else                       type = "EXPENSE";   // default to expense

  const rawDesc   = extractDescription(text);
  const description = rawDesc || (type === "INCOME" ? "Bank Credit" : "Bank Debit");
  const date      = parseDate(text);
  const bank      = detectBank(text);

  // Confidence: high if we found both a clear amount and debit/credit keyword
  const confidence: ParsedSms["confidence"] =
    (isDebit || isCredit) && rawDesc ? "high" :
    (isDebit || isCredit)            ? "medium" : "low";

  return { amount, type, description, date, bank, confidence };
}
