/**
 * CSV parsers for two Brandon-standardized formats:
 * 1. Commentary_Data tab: semicolon-delimited Field;Value key-value pairs
 * 2. Act. v Bud tab: comma-delimited tabular Actuals vs Plan (MTD/QTD/YTD sections)
 */

import type { ParsedFinancials } from "./parseMBR";

// ── Utilities ─────────────────────────────────────────────────────────────────

function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Parse a single CSV line handling quoted fields. */
function parseCSVLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      cells.push(cell.trim()); cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/** Clean a US-formatted number string. Handles commas, $, parentheses for negatives, dashes. */
function cleanNum(raw: string): string | null {
  let s = raw.trim().replace(/[$,\s]/g, "");
  if (!s || s === "-" || s === "—") return null;
  if (s.startsWith("(") && s.endsWith(")")) s = "-" + s.slice(1, -1);
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n).toString();
}

/** Normalize a percentage string. */
function cleanPct(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s.includes("%")) return s;
  const n = parseFloat(s);
  return isNaN(n) ? null : n.toFixed(1) + "%";
}

/** Parse various date formats to "Month YYYY". */
function parseMonthClosed(raw: string): string | null {
  const s = raw.trim().replace(/\s*(MTD|QTD|YTD)\s*/gi, "").trim();
  if (!s) return null;
  // Already readable: "May 2026"
  const long = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20\d{2})/i);
  if (long) return new Date(long[0]).toLocaleString("en-US", { month: "long", year: "numeric" });
  // Short: "May-26"
  const short = s.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\-\s](\d{2})$/i);
  if (short) {
    const d = new Date(`${short[1]} 20${short[2]}`);
    if (!isNaN(d.getTime())) return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  // Numeric MM/DD/YY or MM/DD/YYYY
  const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    let [, month, , year] = parts.map(Number);
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, 1);
    if (!isNaN(d.getTime())) return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  return s;
}

// ── Empty ParsedFinancials shell ──────────────────────────────────────────────

function emptyResult(): ParsedFinancials {
  return {
    clientName: null, contactName: null, monthClosed: null,
    revenue: { actual: "", budget: "" },
    grossProfit: { actual: "", budget: "" },
    grossMarginActualPct: null, grossMarginBudgetPct: null,
    opex: { actual: "", budget: "" },
    netIncome: { actual: "", budget: "" },
    netMarginActualPct: null, netMarginBudgetPct: null,
    cashOnHand: null, monthlyOpex: null, cashRunway: null,
    currentRatio: null, accountsReceivable: null, totalLiabilities: null,
    payrollPctActual: null, payrollPctBudget: null, clientCount: null,
    additionalVariances: [], kpisRaw: "", clientContext: null, notes: null,
  };
}

// ── Commentary_Data key/value parser ─────────────────────────────────────────

const FIELD_MAP: Record<string, string> = {
  clientname:       "clientName",
  contactfirstname: "contactName",
  monthclosed:      "monthClosed",
  revenueactual:    "revenueActual",
  revenuebudget:    "revenueBudget",
  grossprofitactual:"grossProfitActual",
  grossprofitbudget:"grossProfitBudget",
  opexactual:       "opexActual",
  opexbudget:       "opexBudget",
  netincomeactual:  "netIncomeActual",
  netincomebudget:  "netIncomeBudget",
  cashonhand:       "cashOnHand",
  monthlyopexavg:   "monthlyOpex",
  montlyopexavg:    "monthlyOpex",  // typo tolerance
  clientcount:      "clientCount",
  payrollpctactual: "payrollPctActual",
  payrollpctbudget: "payrollPctBudget",
  kpis:             "kpisRaw",
  clientcontext:    "clientContext",
};

export function parseCommentaryDataRows(rows: string[][]): ParsedFinancials {
  const kv: Record<string, string> = {};
  for (const row of rows) {
    if (row.length < 2) continue;
    const key = norm(row[0]);
    const mapped = FIELD_MAP[key];
    if (mapped) kv[mapped] = row[1];
  }

  const result = emptyResult();
  result.clientName    = kv.clientName?.replace(/^﻿/, "").trim() || null;
  result.contactName   = kv.contactName?.trim() || null;
  result.monthClosed   = kv.monthClosed ? parseMonthClosed(kv.monthClosed) : null;
  result.revenue       = { actual: cleanNum(kv.revenueActual ?? "") ?? "", budget: cleanNum(kv.revenueBudget ?? "") ?? "" };
  result.grossProfit   = { actual: cleanNum(kv.grossProfitActual ?? "") ?? "", budget: cleanNum(kv.grossProfitBudget ?? "") ?? "" };
  result.opex          = { actual: cleanNum(kv.opexActual ?? "") ?? "", budget: cleanNum(kv.opexBudget ?? "") ?? "" };
  result.netIncome     = { actual: cleanNum(kv.netIncomeActual ?? "") ?? "", budget: cleanNum(kv.netIncomeBudget ?? "") ?? "" };
  result.cashOnHand    = cleanNum(kv.cashOnHand ?? "");
  result.monthlyOpex   = cleanNum(kv.monthlyOpex ?? "");
  result.clientCount   = kv.clientCount?.trim() || null;
  result.payrollPctActual = cleanPct(kv.payrollPctActual ?? "");
  result.payrollPctBudget = cleanPct(kv.payrollPctBudget ?? "");
  result.kpisRaw       = kv.kpisRaw?.trim() ?? "";
  result.clientContext = kv.clientContext?.trim() || null;
  return result;
}

// ── Act. v Bud tabular parser ────────────────────────────────────────────────

const SUB_ACCOUNTS = [
  { key: "peoplecosts",             label: "People Costs / Payroll" },
  { key: "salesmarketing",          label: "Sales & Marketing" },
  { key: "travelentertainment",     label: "Travel & Entertainment" },
  { key: "generaladministrative",   label: "General & Administrative" },
  { key: "professionalservices",    label: "Professional Services" },
  { key: "costofservices",          label: "Cost of Services" },
];

export function parseActVBudRows(rows: string[][]): ParsedFinancials {
  const result = emptyResult();

  // Find header row containing "Account Name" + "Actuals"/"Plan"
  let headerIdx = -1;
  let actualCol = -1;
  let planCol = -1;
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row.some(c => norm(c) === "accountname")) continue;
    if (!row.some(c => norm(c) === "actuals" || norm(c) === "actual")) continue;
    headerIdx = r;
    for (let c = 0; c < row.length; c++) {
      const v = norm(row[c]);
      if ((v === "actuals" || v === "actual") && actualCol < 0) actualCol = c;
      if ((v === "plan" || v === "budget") && planCol < 0) planCol = c;
    }
    break;
  }
  if (headerIdx < 0 || actualCol < 0 || planCol < 0) return result;

  // Extract month from rows above header
  for (let r = 0; r < headerIdx; r++) {
    for (const cell of rows[r]) {
      const m = parseMonthClosed(cell);
      if (m && m !== cell) { result.monthClosed = m; break; }
    }
    if (result.monthClosed) break;
  }

  const dataRows = rows.slice(headerIdx + 1);

  function findFirstRow(...labels: string[]): string[] | null {
    for (const row of dataRows) {
      const lbl = norm(row[0]);
      if (labels.some(l => lbl === l)) return row;
    }
    return null;
  }

  const get = (row: string[] | null, col: number) => row ? cleanNum(row[col] ?? "") : null;

  const revRow    = findFirstRow("revenues", "totalrevenues", "totalrevenue");
  const gpRow     = findFirstRow("grossincome", "grossprofit");
  const opexRow   = findFirstRow("totaloperatingexpenses", "totalopex");
  const niRow     = findFirstRow("netincome");
  const subsRow   = findFirstRow("subscriptions");
  const arpuRow   = findFirstRow("arpu");

  // Percentage rows (contain "%" in label)
  const gpPctRow  = dataRows.find(r => norm(r[0]).includes("grossincome") && r[0].includes("%")) ?? null;
  const niPctRow  = dataRows.find(r => norm(r[0]).includes("netincome") && r[0].includes("%")) ?? null;

  result.revenue    = { actual: get(revRow, actualCol) ?? "", budget: get(revRow, planCol) ?? "" };
  result.grossProfit = { actual: get(gpRow, actualCol) ?? "", budget: get(gpRow, planCol) ?? "" };
  result.opex       = { actual: get(opexRow, actualCol) ?? "", budget: get(opexRow, planCol) ?? "" };
  result.netIncome  = { actual: get(niRow, actualCol) ?? "", budget: get(niRow, planCol) ?? "" };
  result.grossMarginActualPct = gpPctRow?.[actualCol]?.trim() || null;
  result.grossMarginBudgetPct = gpPctRow?.[planCol]?.trim() || null;
  result.netMarginActualPct   = niPctRow?.[actualCol]?.trim() || null;
  result.netMarginBudgetPct   = niPctRow?.[planCol]?.trim() || null;
  result.clientCount          = get(subsRow, actualCol);

  // KPI lines
  const kpiLines: string[] = [];
  if (subsRow) { const v = get(subsRow, actualCol); const p = get(subsRow, planCol); if (v) kpiLines.push(`Subscriptions: ${v}${p ? ` (Plan: ${p})` : ""}`); }
  if (arpuRow) { const v = get(arpuRow, actualCol); const p = get(arpuRow, planCol); if (v) kpiLines.push(`ARPU: $${v}${p ? ` (Plan: $${p})` : ""}`); }
  if (result.grossMarginActualPct) kpiLines.push(`Gross Margin: ${result.grossMarginActualPct} (Plan: ${result.grossMarginBudgetPct ?? "—"})`);
  result.kpisRaw = kpiLines.join("\n");

  // Auto-flag sub-account variances (deduplicated — only first occurrence)
  const seen = new Set<string>();
  for (const row of dataRows) {
    const lbl = norm(row[0]);
    const match = SUB_ACCOUNTS.find(s => lbl === s.key);
    if (!match || seen.has(match.label)) continue;
    seen.add(match.label);
    const actual = parseFloat(cleanNum(row[actualCol] ?? "") ?? "0");
    const budget = parseFloat(cleanNum(row[planCol] ?? "") ?? "0");
    if (!budget) continue;
    const varAmt = actual - budget;
    const varPct = (varAmt / Math.abs(budget)) * 100;
    if (Math.abs(varAmt) > 10000 && Math.abs(varPct) >= 15) {
      result.additionalVariances.push({
        account: match.label, actual: actual.toString(), budget: budget.toString(),
        variancePct: (varPct >= 0 ? "+" : "") + varPct.toFixed(1) + "%", driver: "",
      });
    }
  }

  return result;
}

// ── Entry point: detect format and parse ─────────────────────────────────────

export function parseCSVText(text: string, filename: string): ParsedFinancials {
  const name = filename.toLowerCase();
  // Commentary_Data: semicolon-delimited OR filename contains "commentary" OR "test"
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const delimiter = lines[0]?.includes(";") ? ";" : ",";
  const isKeyValue = delimiter === ";" || name.includes("commentary") || name.includes("test");

  if (isKeyValue) {
    const rows = lines.map(l => parseCSVLine(l, delimiter));
    return parseCommentaryDataRows(rows);
  } else {
    const rows = lines.map(l => parseCSVLine(l, ","));
    return parseActVBudRows(rows);
  }
}
