/**
 * Deterministic parser for RCG ops plan Excel files.
 * Reads the MBR tab (and Dashboard tab) directly — no Claude needed.
 * Column structure in MBR: Account Name | Account # | Actuals | Plan | (blank) | Variance | Variance (%)
 */

import * as XLSX from "xlsx";

export interface ParsedFinancials {
  clientName: string | null;
  monthClosed: string | null;
  revenue:      { actual: string; budget: string };
  grossProfit:  { actual: string; budget: string };
  grossMarginActualPct: string | null;
  grossMarginBudgetPct: string | null;
  opex:         { actual: string; budget: string };
  netIncome:    { actual: string; budget: string };
  netMarginActualPct: string | null;
  netMarginBudgetPct: string | null;
  cashOnHand:         string | null;
  monthlyOpex:        string | null;
  cashRunway:         string | null;
  currentRatio:       string | null;
  accountsReceivable: string | null;
  totalLiabilities:   string | null;
  payrollPctActual:   string | null;
  payrollPctBudget:   string | null;
  clientCount:        string | null;
  additionalVariances: Array<{
    account: string;
    actual: string;
    budget: string;
    variancePct: string;
    driver: string;
  }>;
  kpisRaw: string;
  notes: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip $, commas, spaces. Convert parentheses to negative. Return plain float string. */
function cleanNumber(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim();
  if (s === "-" || s === "—" || s === "#REF!" || s === "#N/A") return null;
  // Remove $ and commas
  let cleaned = s.replace(/[$,\s]/g, "");
  // (1,234) → -1234
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = "-" + cleaned.slice(1, -1);
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n.toString();
}

/** Parse a percentage string like "82.3%" → "82.3%" (keep as-is for display) */
function cleanPct(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim();
  if (s.includes("%")) return s;
  const n = parseFloat(s);
  if (!isNaN(n) && Math.abs(n) <= 1) return (n * 100).toFixed(1) + "%"; // decimal form
  if (!isNaN(n)) return n.toFixed(1) + "%";
  return null;
}

/** Normalize a label for fuzzy matching */
function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Find a row by matching account name label */
function findRow(rows: unknown[][], ...keywords: string[]): unknown[] | null {
  for (const row of rows) {
    const label = norm(row[0]) + norm(row[1]);
    if (keywords.some((k) => label.includes(k))) return row;
  }
  return null;
}

// ── Sheet → rows helper ───────────────────────────────────────────────────────

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseMBR(buffer: ArrayBuffer): { data: ParsedFinancials; sheetNames: string[] } {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetNames = wb.SheetNames;

  // Find MBR / P&L sheet — try multiple common tab names
  const mbrName = wb.SheetNames.find((n) =>
    norm(n).includes("mbr") ||
    norm(n) === "pl" ||
    norm(n) === "pandl" ||
    norm(n).includes("incomestatement") ||
    norm(n).includes("pnl") ||
    norm(n) === "is" ||
    norm(n).includes("budgetvsactual") ||
    norm(n).includes("budgetactual") ||
    norm(n).includes("bva") ||
    norm(n).includes("financials")
  ) ?? null;

  const dashName = wb.SheetNames.find((n) => norm(n).includes("dashboard")) ?? null;

  const mbrRows  = mbrName  ? sheetToRows(wb, mbrName)  : [];
  const dashRows = dashName ? sheetToRows(wb, dashName) : [];

  // ── Extract month + client name from MBR header rows ─────────────────────
  let monthClosed: string | null = null;
  let clientName:  string | null = null;

  for (const row of mbrRows.slice(0, 10)) {
    for (const cell of row) {
      const s = String(cell ?? "").trim();
      // Look for month patterns: "April 2026 MTD", "Jun-26", "6/1/2026"
      const monthMatch = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-]*(20\d{2})/i);
      if (monthMatch && !monthClosed) {
        monthClosed = s.replace(/MTD|YTD/gi, "").trim();
      }
      // Date cell like 4/1/2026
      const dateMatch = s.match(/^(\d{1,2})\/1\/(20\d{2})$/);
      if (dateMatch && !monthClosed) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          monthClosed = d.toLocaleString("en-US", { month: "long", year: "numeric" });
        }
      }
    }
  }

  // ── Find the header row (Actuals | Plan | Variance) ──────────────────────
  let dataColActual = 2; // default: col index 2
  let dataColBudget = 3;

  for (let i = 0; i < Math.min(mbrRows.length, 15); i++) {
    const row = mbrRows[i];
    for (let c = 0; c < row.length; c++) {
      const v = norm(row[c]);
      if (v === "actuals" || v === "actual") dataColActual = c;
      if (v === "plan" || v === "budget") dataColBudget = c;
    }
  }

  // ── Extract income statement rows ─────────────────────────────────────────
  const rev   = findRow(mbrRows, "revenues", "totalrevenue", "revenue");
  const cos   = findRow(mbrRows, "costofservice", "costofgood", "cogs", "cos");
  const gp    = findRow(mbrRows, "grossincome", "grossprofit", "netoperatingincome");
  const gpPct = findRow(mbrRows, "grossincome%", "grossprofit%", "grossincomepct", "grossmargin%");
  const totalOpex = findRow(mbrRows, "totaloperatingexpense", "totalopex", "operatingexpenses");
  const noi   = findRow(mbrRows, "netoperatingincome", "noi");
  const noiPct = findRow(mbrRows, "netoperatingincome%", "noipct", "netoperatingincomepct");
  const ni    = findRow(mbrRows, "netincome");
  const niPct = findRow(mbrRows, "netincome%", "netincomepct", "netmargin");

  // OpEx sub-accounts (for flagged variances)
  const peopleCosts  = findRow(mbrRows, "peoplecost", "payrollexpense", "salaries");
  const salesMkt     = findRow(mbrRows, "salesmkt", "salesmarketing", "marketing");
  const te           = findRow(mbrRows, "travelentertain", "travel");
  const ga           = findRow(mbrRows, "generaladmin", "ga", "general");
  const profSvc      = findRow(mbrRows, "professionalservice", "profsvc");

  // Statistics
  const payrollPct = findRow(mbrRows, "payrollofrevenue", "payrollpct", "payroll%ofrev");
  const clientRow  = findRow(mbrRows, "clients", "clientcount", "subscriptions", "members", "activeaccounts");
  const arpu       = findRow(mbrRows, "arpu", "averagerevenue");

  // ── Auto-flag variances ±15% AND >$10K ───────────────────────────────────
  const subAccounts = [
    peopleCosts && { row: peopleCosts, name: "People Costs / Payroll" },
    salesMkt    && { row: salesMkt,    name: "Sales & Marketing" },
    te          && { row: te,          name: "Travel & Entertainment" },
    ga          && { row: ga,          name: "General & Administrative" },
    profSvc     && { row: profSvc,     name: "Professional Services" },
    cos         && { row: cos,         name: "Cost of Services" },
  ].filter(Boolean) as Array<{ row: unknown[]; name: string }>;

  const additionalVariances: ParsedFinancials["additionalVariances"] = [];
  for (const { row, name } of subAccounts) {
    const actual = parseFloat(cleanNumber(row[dataColActual]) ?? "0");
    const budget = parseFloat(cleanNumber(row[dataColBudget]) ?? "0");
    if (!budget) continue;
    const varAmt = actual - budget;
    const varPct = (varAmt / Math.abs(budget)) * 100;
    if (Math.abs(varAmt) > 10000 && Math.abs(varPct) >= 15) {
      additionalVariances.push({
        account: name,
        actual:  actual.toString(),
        budget:  budget.toString(),
        variancePct: (varPct >= 0 ? "+" : "") + varPct.toFixed(1) + "%",
        driver: "",
      });
    }
  }

  // ── Dashboard + Balance Sheet values ─────────────────────────────────────
  // Search Dashboard tab first, then Balance Sheet (BS), then any sheet with cash data.
  let cashOnHand:         string | null = null;
  let cashRunway:         string | null = null;
  let currentRatio:       string | null = null;
  let accountsReceivable: string | null = null;
  let totalLiabilities:   string | null = null;

  // Sheets to search for balance sheet data, in priority order
  const bsSheetNames = [
    dashName,
    wb.SheetNames.find((n) => norm(n) === "bs"),
    wb.SheetNames.find((n) => norm(n) === "bsce"),
    wb.SheetNames.find((n) => norm(n).includes("balancesheet")),
    wb.SheetNames.find((n) => norm(n).includes("cashwalk")),
    wb.SheetNames.find((n) => norm(n).includes("finsum")),
  ].filter(Boolean) as string[];

  for (const sheetName of bsSheetNames) {
    const rows = sheetToRows(wb, sheetName);
    // Scan up to 40 rows
    for (let r = 0; r < Math.min(rows.length, 40); r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const label = norm(row[c]);
        // Value can be in the same row (next col) or the row below
        const candidates = [row[c + 1], row[c + 2], rows[r + 1]?.[c], rows[r + 1]?.[c + 1]];

        const tryExtract = (v: unknown) => {
          const n = cleanNumber(v);
          if (!n) return;
          if (!cashOnHand         && (label.includes("cashonhand") || label === "cashhand" || label === "cash")) cashOnHand = n;
          if (!cashRunway         && (label.includes("cashrunway") || label.includes("runway")))                  cashRunway = n;
          if (!currentRatio       && label.includes("currentratio"))                                              currentRatio = n;
          if (!accountsReceivable && (label.includes("accountreceiv") || label.includes("receivable")))           accountsReceivable = n;
          if (!totalLiabilities   && (label.includes("totalliab") || label === "debt" || label.includes("totaldebt"))) totalLiabilities = n;
        };

        candidates.forEach(tryExtract);
      }
    }
    // Stop searching sheets once we have cash
    if (cashOnHand) break;
  }

  // ── Build KPIs raw string ─────────────────────────────────────────────────
  const kpiLines: string[] = [];
  if (clientRow) {
    const count = cleanNumber(clientRow[dataColActual]);
    if (count) kpiLines.push(`Client Count: ${count}`);
  }
  if (arpu) {
    const v = cleanNumber(arpu[dataColActual]);
    const p = cleanNumber(arpu[dataColBudget]);
    if (v) kpiLines.push(`ARPU: $${v}${p ? ` (Plan: $${p})` : ""}`);
  }
  const gpPctActual = gpPct ? cleanPct(gpPct[dataColActual]) : null;
  const gpPctBudget = gpPct ? cleanPct(gpPct[dataColBudget]) : null;
  if (gpPctActual) kpiLines.push(`Gross Margin: ${gpPctActual}${gpPctBudget ? ` (Plan: ${gpPctBudget})` : ""}`);

  const noiActual = noi ? cleanNumber(noi[dataColActual]) : null;
  const noiPctActual = noiPct ? cleanPct(noiPct[dataColActual]) : null;
  if (noiActual) kpiLines.push(`NOI: $${noiActual}${noiPctActual ? ` (${noiPctActual} margin)` : ""}`);

  if (payrollPct) {
    const v = cleanPct(payrollPct[dataColActual]);
    const p = cleanPct(payrollPct[dataColBudget]);
    if (v) kpiLines.push(`Payroll % of Revenue: ${v}${p ? ` (Plan: ${p})` : ""}`);
  }
  if (cashRunway) kpiLines.push(`Cash Runway: ${cashRunway} months`);
  if (currentRatio) kpiLines.push(`Current Ratio: ${currentRatio}`);
  if (accountsReceivable) kpiLines.push(`Accounts Receivable: $${Number(accountsReceivable).toLocaleString()}`);
  if (totalLiabilities) kpiLines.push(`Debt / Total Liabilities: $${Number(totalLiabilities).toLocaleString()}`);

  const data: ParsedFinancials = {
    clientName,
    monthClosed,
    revenue: {
      actual: cleanNumber(rev?.[dataColActual]) ?? "",
      budget: cleanNumber(rev?.[dataColBudget]) ?? "",
    },
    grossProfit: {
      actual: cleanNumber(gp?.[dataColActual]) ?? "",
      budget: cleanNumber(gp?.[dataColBudget]) ?? "",
    },
    grossMarginActualPct: gpPctActual,
    grossMarginBudgetPct: gpPctBudget,
    opex: {
      actual: cleanNumber(totalOpex?.[dataColActual]) ?? "",
      budget: cleanNumber(totalOpex?.[dataColBudget]) ?? "",
    },
    netIncome: {
      actual: cleanNumber(ni?.[dataColActual]) ?? "",
      budget: cleanNumber(ni?.[dataColBudget]) ?? "",
    },
    netMarginActualPct: niPct ? cleanPct(niPct[dataColActual]) : null,
    netMarginBudgetPct: niPct ? cleanPct(niPct[dataColBudget]) : null,
    cashOnHand,
    monthlyOpex: cleanNumber(totalOpex?.[dataColActual]),
    cashRunway,
    currentRatio,
    accountsReceivable,
    totalLiabilities,
    payrollPctActual: payrollPct ? cleanPct(payrollPct[dataColActual]) : null,
    payrollPctBudget: payrollPct ? cleanPct(payrollPct[dataColBudget]) : null,
    clientCount:      clientRow ? cleanNumber(clientRow[dataColActual]) : null,
    additionalVariances,
    kpisRaw: kpiLines.join("\n"),
    notes: null,
  };

  return { data, sheetNames };
}
