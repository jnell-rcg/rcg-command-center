/**
 * Deterministic parser for RCG ops plan Excel files.
 * Reads the MBR tab (and Dashboard tab) directly — no Claude needed.
 * Column structure in MBR: Account Name | Account # | Actuals | Plan | (blank) | Variance | Variance (%)
 */

import * as XLSX from "xlsx";

export interface ParsedFinancials {
  clientName: string | null;
  contactName: string | null;
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
  clientContext: string | null;
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

// ── IS-layout helpers ─────────────────────────────────────────────────────────

function isExcelDate(val: unknown): boolean {
  if (val instanceof Date) return true;
  if (typeof val === "number" && val > 40000 && val < 60000) return true;
  return false;
}

function excelDateToMonthStr(val: unknown): string | null {
  try {
    let d: Date;
    if (val instanceof Date) d = val;
    else if (typeof val === "number") {
      d = new Date(Date.UTC(1899, 11, 30) + val * 86400000);
    } else return null;
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  } catch { return null; }
}

/** Returns true if the string looks like a date (various formats ops plans use). */
function looksLikeMonthHeader(val: unknown): boolean {
  if (isExcelDate(val)) return true;
  if (typeof val !== "string") return false;
  const s = val.trim();
  // "Jan-26", "January 2026", "Jan 2026"
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s)) return true;
  // "1/1/2026", "01/01/2026", "1-1-2026"
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) return true;
  // "1/2026", "01/2026"
  if (/^\d{1,2}[\/\-]\d{4}$/.test(s)) return true;
  // "2026-01" ISO partial
  if (/^\d{4}[\/\-]\d{2}$/.test(s)) return true;
  return false;
}

/** Detect IS-tab layout: "Account Name" header row, month date headers in later cols.
 *  Returns actualCol (rightmost month with data), budgetCol (Plan/Budget col or 999), and monthClosed. */
function detectISLayout(rows: unknown[][]): {
  actualCol: number;
  budgetCol: number;
  monthClosed: string | null;
  debug: string;
} | null {
  // Search up to row 30 (some files have tall title blocks)
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (!norm(rows[r][c]).includes("accountname")) continue;

      const hdrRow = rows[r];
      let budgetCol = -1;
      let actualCol = -1;

      // Find explicit Plan/Budget column (text header)
      for (let cc = c + 1; cc < hdrRow.length; cc++) {
        const h = norm(hdrRow[cc]);
        if (h === "plan" || h === "budget" || h.includes("annualplan") || h.includes("annualbudget")) {
          budgetCol = cc;
        }
      }

      // Rightmost date-typed column that has numeric data below it
      // Extend data-row search to r+80 to handle tall summary blocks between header and data
      for (let cc = hdrRow.length - 1; cc > c; cc--) {
        if (cc === budgetCol) continue;
        if (!looksLikeMonthHeader(hdrRow[cc])) continue;
        for (let rr = r + 1; rr < Math.min(rows.length, r + 80); rr++) {
          if (cleanNumber(rows[rr][cc])) { actualCol = cc; break; }
        }
        if (actualCol >= 0) break;
      }

      if (actualCol < 0) {
        return null;
      }

      const hdrMonthVal = hdrRow[actualCol];
      const monthClosed = isExcelDate(hdrMonthVal)
        ? excelDateToMonthStr(hdrMonthVal)
        : typeof hdrMonthVal === "string" ? hdrMonthVal.trim() : null;

      return {
        actualCol,
        budgetCol: budgetCol >= 0 ? budgetCol : 999,
        monthClosed,
        debug: `IS layout: header row ${r + 1}, label col ${c}, actual col ${actualCol}, budget col ${budgetCol >= 0 ? budgetCol : "none"}`,
      };
    }
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

export function parseMBR(buffer: ArrayBuffer): { data: ParsedFinancials; sheetNames: string[]; parsedTab: string | null; parseDebug: string[] } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames = wb.SheetNames;

  const parseDebug: string[] = [];

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
    norm(n).includes("actvbud") ||       // "Act. v Bud"
    norm(n).includes("actualsvsb") ||    // "Actuals vs Budget"
    norm(n).includes("bva") ||
    norm(n).includes("financials")
  ) ?? null;

  parseDebug.push(`Tab search: mbrName="${mbrName ?? "none"}", available=[${wb.SheetNames.join(", ")}]`);

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
  let headersFound = false;

  for (let i = 0; i < Math.min(mbrRows.length, 15); i++) {
    const row = mbrRows[i];
    for (let c = 0; c < row.length; c++) {
      const v = norm(row[c]);
      if (v === "actuals" || v === "actual") { dataColActual = c; headersFound = true; }
      if (v === "plan" || v === "budget") { dataColBudget = c; headersFound = true; }
    }
  }

  // If no explicit Actuals/Plan headers, try IS-tab layout (col B labels, date month headers)
  if (!headersFound) {
    parseDebug.push(`No Actuals/Plan headers found — trying IS layout detection on tab "${mbrName}"`);
    const isLayout = detectISLayout(mbrRows);
    if (isLayout) {
      dataColActual = isLayout.actualCol;
      dataColBudget = isLayout.budgetCol;
      if (!monthClosed && isLayout.monthClosed) monthClosed = isLayout.monthClosed;
      parseDebug.push(isLayout.debug);
    } else {
      parseDebug.push(`IS layout detection failed — "Account Name" header or month columns not found in first 30 rows`);
      // Emit first 30 rows col B values for diagnosis
      const colBSample = mbrRows.slice(0, 30).map((r, i) => `row${i + 1}:${JSON.stringify(r[1])}`).join(", ");
      parseDebug.push(`Col B sample: ${colBSample}`);
    }
  } else {
    parseDebug.push(`MBR layout: Actuals col ${dataColActual}, Budget col ${dataColBudget}`);
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
    contactName: null,
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
    clientContext: null,
    notes: null,
  };

  return { data, sheetNames, parsedTab: mbrName, parseDebug };
}
