import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import ExcelJS from "exceljs";

// GET /api/export/excel — download full Excel report
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from     = searchParams.get("from");
  const to       = searchParams.get("to");
  const typeFilter = searchParams.get("type"); // "INCOME" | "EXPENSE" | null

  const where: Record<string, unknown> = { userId: session.user.id };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
    };
  }
  if (typeFilter === "INCOME" || typeFilter === "EXPENSE") {
    where.type = typeFilter;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const numFmt = `"₹"#,##0.00`;

  // ─── Aggregate helpers ──────────────────────────────────────────────────────
  const totalIncome  = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const netBalance   = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? ((netBalance / totalIncome) * 100) : 0;

  // Monthly buckets
  type MonthBucket = { income: number; expense: number };
  const monthlyMap = new Map<string, MonthBucket>();
  for (const t of transactions) {
    const key = format(new Date(t.date), "yyyy-MM");
    if (!monthlyMap.has(key)) monthlyMap.set(key, { income: 0, expense: 0 });
    const b = monthlyMap.get(key)!;
    if (t.type === "INCOME")  b.income  += t.amount;
    else                       b.expense += t.amount;
  }

  // Category buckets
  type CatBucket = { type: string; amount: number; count: number };
  const catMap = new Map<string, CatBucket>();
  for (const t of transactions) {
    const name = t.category?.name ?? "Uncategorized";
    if (!catMap.has(name)) catMap.set(name, { type: t.type, amount: 0, count: 0 });
    const b = catMap.get(name)!;
    b.amount += t.amount;
    b.count  += 1;
  }

  // ─── Build workbook ─────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = "FinBudget";
  wb.created  = new Date();
  wb.modified = new Date();

  const HEADER_BG   = "1E3A5F";   // deep navy
  const INCOME_BG   = "E8F5E9";   // light green
  const EXPENSE_BG  = "FFEBEE";   // light red
  const ALT_ROW     = "F8FAFC";   // very light blue-grey
  const ACCENT      = "2563EB";   // blue

  const headerFont  = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const titleFont   = { name: "Arial", bold: true, size: 14, color: { argb: `FF${ACCENT}` } };
  const subFont     = { name: "Arial", size: 10, color: { argb: "FF6B7280" } };
  const bodyFont    = { name: "Arial", size: 10 };

  const headerFill  = (argb: string): ExcelJS.Fill => ({
    type: "pattern", pattern: "solid", fgColor: { argb: `FF${argb}` },
  });
  const solidFill   = (argb: string): ExcelJS.Fill => ({
    type: "pattern", pattern: "solid", fgColor: { argb },
  });

  const thinBorder: ExcelJS.Borders = {
    top:      { style: "thin", color: { argb: "FFE5E7EB" } },
    left:     { style: "thin", color: { argb: "FFE5E7EB" } },
    bottom:   { style: "thin", color: { argb: "FFE5E7EB" } },
    right:    { style: "thin", color: { argb: "FFE5E7EB" } },
    diagonal: { style: "thin", color: { argb: "FFE5E7EB" } },
  };

  const periodLabel =
    from && to   ? `${from} to ${to}` :
    from         ? `From ${from}`      :
    to           ? `Up to ${to}`       :
    "All time";

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 1: Summary
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Summary", { properties: { tabColor: { argb: `FF${ACCENT}` } } });
    ws.columns = [
      { width: 28 },
      { width: 22 },
      { width: 20 },
      { width: 20 },
    ];

    // Title block
    ws.mergeCells("A1:D1");
    const title = ws.getCell("A1");
    title.value = "FinBudget — Financial Report";
    title.font  = { name: "Arial", bold: true, size: 18, color: { argb: `FF${HEADER_BG}` } };
    title.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 36;

    ws.mergeCells("A2:D2");
    const sub = ws.getCell("A2");
    sub.value = `Period: ${periodLabel}   |   Type: ${typeFilter ?? "All"}   |   Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`;
    sub.font  = subFont;
    sub.alignment = { horizontal: "center" };

    ws.getRow(3).height = 8;

    // KPI boxes
    const kpis = [
      { label: "Total Income",    value: totalIncome,   bg: "E8F5E9", fg: "166534" },
      { label: "Total Expenses",  value: totalExpense,  bg: "FFEBEE", fg: "991B1B" },
      { label: "Net Balance",     value: netBalance,    bg: "EFF6FF", fg: "1E40AF" },
      { label: "Savings Rate",    value: null,          bg: "FFF7ED", fg: "9A3412", extra: `${savingsRate.toFixed(1)}%` },
    ];

    const kpiRow = 4;
    kpis.forEach((k, i) => {
      const col = String.fromCharCode(65 + i); // A, B, C, D
      const labelCell = ws.getCell(`${col}${kpiRow}`);
      labelCell.value = k.label;
      labelCell.font  = { name: "Arial", bold: true, size: 10, color: { argb: `FF${k.fg}` } };
      labelCell.fill  = solidFill(`FF${k.bg}`);
      labelCell.alignment = { horizontal: "center", vertical: "middle" };
      labelCell.border = thinBorder;
      ws.getRow(kpiRow).height = 20;

      const valCell = ws.getCell(`${col}${kpiRow + 1}`);
      if (k.extra) {
        valCell.value = k.extra;
        valCell.font  = { name: "Arial", bold: true, size: 18, color: { argb: `FF${k.fg}` } };
      } else {
        valCell.value = k.value;
        valCell.numFmt = numFmt;
        valCell.font  = { name: "Arial", bold: true, size: 16, color: { argb: `FF${k.fg}` } };
      }
      valCell.fill  = solidFill(`FF${k.bg}`);
      valCell.alignment = { horizontal: "center", vertical: "middle" };
      valCell.border = thinBorder;
      ws.getRow(kpiRow + 1).height = 40;
    });

    ws.getRow(kpiRow + 2).height = 8;

    // Quick stats table
    const statsRow = kpiRow + 3;
    const statsHeader = ws.getRow(statsRow);
    ["Metric", "Value"].forEach((h, i) => {
      const c = statsHeader.getCell(i + 1);
      c.value = h;
      c.font  = headerFont;
      c.fill  = headerFill(HEADER_BG);
      c.alignment = { horizontal: "center" };
      c.border = thinBorder;
    });
    ws.getRow(statsRow).height = 22;

    const stats = [
      ["Total Transactions",      transactions.length],
      ["Income Transactions",     transactions.filter(t => t.type === "INCOME").length],
      ["Expense Transactions",    transactions.filter(t => t.type === "EXPENSE").length],
      ["Largest Income",          Math.max(0, ...transactions.filter(t => t.type === "INCOME").map(t => t.amount))],
      ["Largest Expense",         Math.max(0, ...transactions.filter(t => t.type === "EXPENSE").map(t => t.amount))],
      ["Average Transaction",     transactions.length > 0 ? (transactions.reduce((s, t) => s + t.amount, 0) / transactions.length) : 0],
      ["Months Covered",          monthlyMap.size],
    ];

    stats.forEach(([label, val], idx) => {
      const row = ws.getRow(statsRow + 1 + idx);
      const labelC = row.getCell(1);
      labelC.value = label;
      labelC.font  = { name: "Arial", size: 10 };
      labelC.border = thinBorder;
      labelC.fill   = solidFill(idx % 2 === 0 ? "FFFFFFFF" : `FF${ALT_ROW}`);

      const valC = row.getCell(2);
      if (typeof val === "number" && (label as string).includes("Transactions") || (label as string) === "Months Covered") {
        valC.value = val;
      } else if (typeof val === "number") {
        valC.value = val;
        valC.numFmt = numFmt;
      } else {
        valC.value = val;
      }
      valC.font   = { name: "Arial", size: 10 };
      valC.border = thinBorder;
      valC.fill   = solidFill(idx % 2 === 0 ? "FFFFFFFF" : `FF${ALT_ROW}`);
      row.height = 20;
    });

    // Sheet guide
    const guideStart = statsRow + stats.length + 2;
    ws.mergeCells(`A${guideStart}:D${guideStart}`);
    const guideTitle = ws.getCell(`A${guideStart}`);
    guideTitle.value = "Workbook Guide";
    guideTitle.font  = { name: "Arial", bold: true, size: 12, color: { argb: `FF${HEADER_BG}` } };

    const guide = [
      ["Sheet",              "Contents"],
      ["1. Summary",         "Key metrics, KPIs and quick stats (this sheet)"],
      ["2. All Transactions","Complete transaction list with color coding and filters"],
      ["3. Monthly Analysis","Month-by-month income vs expense with data bars"],
      ["4. Category Breakdown","Spending by category with visual data bars"],
    ];
    guide.forEach(([sheet, desc], idx) => {
      const row = ws.getRow(guideStart + 1 + idx);
      const c1 = row.getCell(1);
      const c2 = row.getCell(2);
      c1.value = sheet; c1.font = idx === 0 ? { name: "Arial", bold: true, size: 10 } : { name: "Arial", size: 10 };
      c2.value = desc;  c2.font = idx === 0 ? { name: "Arial", bold: true, size: 10 } : { name: "Arial", size: 10 };
      if (idx === 0) {
        c1.fill = headerFill(HEADER_BG); c1.font = headerFont;
        c2.fill = headerFill(HEADER_BG); c2.font = headerFont;
      } else {
        c1.fill = solidFill(idx % 2 === 0 ? "FFFFFFFF" : `FF${ALT_ROW}`);
        c2.fill = solidFill(idx % 2 === 0 ? "FFFFFFFF" : `FF${ALT_ROW}`);
      }
      c1.border = thinBorder; c2.border = thinBorder;
      row.height = 20;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 2: All Transactions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("All Transactions", { properties: { tabColor: { argb: "FF16A34A" } } });

    ws.columns = [
      { header: "Date",        key: "date",        width: 14 },
      { header: "Description", key: "description", width: 36 },
      { header: "Type",        key: "type",        width: 12 },
      { header: "Category",    key: "category",    width: 22 },
      { header: "Amount",      key: "amount",      width: 16 },
      { header: "Notes",       key: "notes",       width: 30 },
      { header: "Recurring",   key: "recurring",   width: 14 },
    ];

    // Style header row
    const hRow = ws.getRow(1);
    hRow.height = 24;
    hRow.eachCell((cell) => {
      cell.font   = headerFont;
      cell.fill   = headerFill(HEADER_BG);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    });

    // Data rows
    transactions.forEach((t, idx) => {
      const isIncome = t.type === "INCOME";
      const rowBg    = isIncome ? `FF${INCOME_BG}` : `FF${EXPENSE_BG}`;

      const row = ws.addRow({
        date:        format(new Date(t.date), "dd MMM yyyy"),
        description: t.description,
        type:        t.type,
        category:    t.category?.name ?? "Uncategorized",
        amount:      t.amount,
        notes:       t.notes ?? "",
        recurring:   t.isRecurring ? (t.recurringInterval ?? "yes") : "no",
      });
      row.height = 20;

      row.eachCell((cell) => {
        cell.font   = bodyFont;
        cell.fill   = solidFill(idx % 2 === 0 ? rowBg : (isIncome ? "FFF0FDF4" : "FFFFF1F2"));
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle" };
      });

      // Format amount column
      const amountCell = row.getCell("amount");
      amountCell.numFmt = numFmt;
      amountCell.font   = { name: "Arial", size: 10, bold: true, color: { argb: isIncome ? "FF166534" : "FF991B1B" } };
      amountCell.alignment = { horizontal: "right", vertical: "middle" };
    });

    // Totals row
    const totalRowNum = transactions.length + 2;
    const totalsRow = ws.getRow(totalRowNum);
    totalsRow.height = 24;

    const labelCell = totalsRow.getCell(1);
    labelCell.value = "TOTAL";
    labelCell.font  = { name: "Arial", bold: true, size: 11 };
    labelCell.fill  = headerFill("374151");
    labelCell.border = thinBorder;
    labelCell.alignment = { horizontal: "center" };

    // Merge description to category
    ws.mergeCells(`B${totalRowNum}:D${totalRowNum}`);
    const descCell = totalsRow.getCell(2);
    descCell.value = `${transactions.length} transactions`;
    descCell.font  = { name: "Arial", size: 10, color: { argb: "FFD1D5DB" } };
    descCell.fill  = headerFill("374151");
    descCell.border = thinBorder;
    descCell.alignment = { horizontal: "center" };

    const sumCell = totalsRow.getCell(5);
    sumCell.value  = { formula: `SUM(E2:E${totalRowNum - 1})` };
    sumCell.numFmt = numFmt;
    sumCell.font   = { name: "Arial", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    sumCell.fill   = headerFill("374151");
    sumCell.border = thinBorder;
    sumCell.alignment = { horizontal: "right" };

    [6, 7].forEach(col => {
      const c = totalsRow.getCell(col);
      c.fill   = headerFill("374151");
      c.border = thinBorder;
    });

    // Auto-filter and freeze
    ws.autoFilter = { from: "A1", to: "G1" };
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 3: Monthly Analysis
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Monthly Analysis", { properties: { tabColor: { argb: "FFFBBF24" } } });

    ws.columns = [
      { header: "Month",        key: "month",    width: 16 },
      { header: "Income",       key: "income",   width: 18 },
      { header: "Expenses",     key: "expenses", width: 18 },
      { header: "Net Balance",  key: "net",      width: 18 },
      { header: "Savings Rate", key: "savings",  width: 16 },
    ];

    const hRow = ws.getRow(1);
    hRow.height = 24;
    hRow.eachCell((cell) => {
      cell.font   = headerFont;
      cell.fill   = headerFill(HEADER_BG);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    });

    // Sort months
    const sortedMonths = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    sortedMonths.forEach(([monthKey, bucket], idx) => {
      const net       = bucket.income - bucket.expense;
      const savings   = bucket.income > 0 ? (net / bucket.income) * 100 : 0;
      const monthLabel = format(parseISO(`${monthKey}-01`), "MMM yyyy");

      const row = ws.addRow({
        month:    monthLabel,
        income:   bucket.income,
        expenses: bucket.expense,
        net:      net,
        savings:  savings / 100,
      });
      row.height = 22;

      const isPositive = net >= 0;
      row.eachCell((cell) => {
        cell.font   = bodyFont;
        cell.fill   = solidFill(idx % 2 === 0 ? "FFFFFFFF" : `FF${ALT_ROW}`);
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle" };
      });

      row.getCell("income").numFmt   = numFmt;
      row.getCell("expenses").numFmt = numFmt;

      const netCell = row.getCell("net");
      netCell.numFmt = numFmt;
      netCell.font   = { name: "Arial", size: 10, bold: true, color: { argb: isPositive ? "FF166534" : "FF991B1B" } };

      const savCell = row.getCell("savings");
      savCell.numFmt = "0.0%";
      savCell.font   = { name: "Arial", size: 10, color: { argb: savings >= 20 ? "FF166534" : savings >= 0 ? "FF92400E" : "FF991B1B" } };
    });

    // Totals row
    const dataRows = sortedMonths.length;
    const totRow = ws.addRow({
      month:    "TOTAL / AVG",
      income:   { formula: `SUM(B2:B${dataRows + 1})` },
      expenses: { formula: `SUM(C2:C${dataRows + 1})` },
      net:      { formula: `SUM(D2:D${dataRows + 1})` },
      savings:  { formula: `IFERROR(D${dataRows + 2}/B${dataRows + 2},0)` },
    });
    totRow.height = 24;
    totRow.eachCell((cell) => {
      cell.font   = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill   = headerFill("374151");
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    totRow.getCell("income").numFmt   = numFmt;
    totRow.getCell("expenses").numFmt = numFmt;
    totRow.getCell("net").numFmt      = numFmt;
    totRow.getCell("savings").numFmt  = "0.0%";

    // Data bars for Income and Expenses columns
    if (dataRows > 0) {
      ws.addConditionalFormatting({
        ref: `B2:B${dataRows + 1}`,
        rules: [{
          type: "dataBar",
          priority: 1,
          gradient: true,
          color: { argb: "FF16A34A" },
          minLength: 0,
          maxLength: 100,
        } as ExcelJS.DataBarRuleType],
      });
      ws.addConditionalFormatting({
        ref: `C2:C${dataRows + 1}`,
        rules: [{
          type: "dataBar",
          priority: 1,
          gradient: true,
          color: { argb: "FFEF4444" },
          minLength: 0,
          maxLength: 100,
        } as ExcelJS.DataBarRuleType],
      });
      // Color scale on Net Balance
      ws.addConditionalFormatting({
        ref: `D2:D${dataRows + 1}`,
        rules: [{
          type: "colorScale",
          priority: 2,
          cfvo: [{ type: "min" }, { type: "percentile", value: 50 }, { type: "max" }],
          color: [{ argb: "FFEF4444" }, { argb: "FFFBBF24" }, { argb: "FF16A34A" }],
        } as ExcelJS.ColorScaleRuleType],
      });
    }

    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 4: Category Breakdown
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Category Breakdown", { properties: { tabColor: { argb: "FF7C3AED" } } });

    ws.columns = [
      { header: "Category",      key: "category", width: 24 },
      { header: "Type",          key: "type",     width: 12 },
      { header: "Total Amount",  key: "amount",   width: 18 },
      { header: "Transactions",  key: "count",    width: 16 },
      { header: "% of Total",    key: "pct",      width: 14 },
    ];

    const hRow = ws.getRow(1);
    hRow.height = 24;
    hRow.eachCell((cell) => {
      cell.font   = headerFont;
      cell.fill   = headerFill(HEADER_BG);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    });

    const grandTotal = transactions.reduce((s, t) => s + t.amount, 0);
    const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1].amount - a[1].amount);

    sortedCats.forEach(([name, data], idx) => {
      const isIncome = data.type === "INCOME";
      const row = ws.addRow({
        category: name,
        type:     data.type,
        amount:   data.amount,
        count:    data.count,
        pct:      grandTotal > 0 ? data.amount / grandTotal : 0,
      });
      row.height = 22;

      row.eachCell((cell) => {
        cell.font   = bodyFont;
        cell.fill   = solidFill(idx % 2 === 0 ? "FFFFFFFF" : `FF${ALT_ROW}`);
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle" };
      });

      row.getCell("amount").numFmt = numFmt;
      row.getCell("amount").font  = { name: "Arial", size: 10, bold: true, color: { argb: isIncome ? "FF166534" : "FF991B1B" } };
      row.getCell("pct").numFmt   = "0.0%";
      row.getCell("type").font    = { name: "Arial", size: 10, color: { argb: isIncome ? "FF166534" : "FF991B1B" } };
    });

    // Totals
    const dataRows = sortedCats.length;
    if (dataRows > 0) {
      const totRow = ws.addRow({
        category: "TOTAL",
        type:     "",
        amount:   { formula: `SUM(C2:C${dataRows + 1})` },
        count:    { formula: `SUM(D2:D${dataRows + 1})` },
        pct:      { formula: `SUM(E2:E${dataRows + 1})` },
      });
      totRow.height = 24;
      totRow.eachCell((cell) => {
        cell.font   = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        cell.fill   = headerFill("374151");
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      totRow.getCell("amount").numFmt = numFmt;
      totRow.getCell("pct").numFmt    = "0.0%";

      // Data bars on Amount column
      ws.addConditionalFormatting({
        ref: `C2:C${dataRows + 1}`,
        rules: [{
          type: "dataBar",
          priority: 1,
          gradient: true,
          color: { argb: "FF7C3AED" },
          minLength: 0,
          maxLength: 100,
        } as ExcelJS.DataBarRuleType],
      });
      // Color scale on % of Total
      ws.addConditionalFormatting({
        ref: `E2:E${dataRows + 1}`,
        rules: [{
          type: "colorScale",
          priority: 2,
          cfvo: [{ type: "min" }, { type: "max" }],
          color: [{ argb: "FFFEF9C3" }, { argb: "FF7C3AED" }],
        } as ExcelJS.ColorScaleRuleType],
      });
    }

    ws.autoFilter = { from: "A1", to: "E1" };
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  }

  // ─── Serialize and respond ──────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const filename = `finbudget-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
