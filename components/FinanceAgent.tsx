"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineItem {
  actual: string;
  budget: string;
}

interface Variance {
  account: string;
  actual: string;
  budget: string;
  driver: string;
  options: string;
}

interface ClientProfile {
  id: string;
  clientName: string;
  contactName: string;
  industry: string;
  format: "A" | "B" | "C";
  monthlyOpex: string; // saved avg — updates each close
}

interface FormState {
  clientId: string;
  clientName: string;
  contactName: string;
  industry: string;
  format: "A" | "B" | "C";
  monthClosed: string;
  revenue: LineItem;
  grossProfit: LineItem;
  grossMarginActualPct: string;
  grossMarginBudgetPct: string;
  opex: LineItem;
  netIncome: LineItem;
  netMarginActualPct: string;
  netMarginBudgetPct: string;
  cashOnHand: string;
  monthlyOpex: string;
  cashRunway: string;
  currentRatio: string;
  accountsReceivable: string;
  totalLiabilities: string;
  payrollPctActual: string;
  payrollPctBudget: string;
  clientCount: string;
  variances: Variance[];
  kpis: string;
  clientContext: string;
  toneNotes: string;
}

// ── Saved client roster (persisted to localStorage) ────────────────────────────

const ROSTER_KEY = "rcg_finance_clients";

function loadRoster(): ClientProfile[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRoster(roster: ClientProfile[]) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
}

// ── Industry KPI templates ─────────────────────────────────────────────────────

const KPI_TEMPLATES: Record<string, string> = {
  "Dealership":
    "Gross per unit (new): $\nGross per unit (used): $\nInventory days: \nFloor plan cost: $",
  "Home Services / Janitorial":
    "Job margin: %\nLabor utilization: %\nGross margin vs. ~50% industry norm: %\nActive contracts: ",
  "Health Tech":
    "Productivity rate: %\nPatient volume: \nRevenue per provider: $\nNo-show rate: %",
  "SaaS / Tech":
    "MRR: $\nMoM MRR growth: %\nChurn rate: %\nARPU: $\nCLV:CAC: x",
  "Fitness / Wellness":
    "Active members: \nNew members: \nChurn: %\nRevenue per member: $\nAvg class capacity: %",
  "Real Estate":
    "Active listings: \nUnits closed: \nAvg days on market: \nGCI: $",
  "Construction":
    "Job margin: %\nBacklog: $\nChange orders: \nLabor cost %: %",
  "Professional Services":
    "Billable utilization: %\nRealization rate: %\nAvg billing rate: $\nActive engagements: ",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcVariance(actual: string, budget: string) {
  const a = parseFloat(actual.replace(/,/g, "")) || 0;
  const b = parseFloat(budget.replace(/,/g, "")) || 0;
  if (!b) return { variance: "—", variancePct: "—", varNum: 0, pctNum: 0 };
  const v = a - b;
  const pct = (v / b) * 100;
  const sign = v >= 0 ? "+" : "";
  return {
    variance: `${sign}${Math.round(v).toLocaleString("en-US")}`,
    variancePct: `${sign}${Math.round(pct)}`,
    varNum: v,
    pctNum: pct,
  };
}

function calcRunway(cashOnHand: string, monthlyOpex: string) {
  const cash = parseFloat(cashOnHand.replace(/,/g, "")) || 0;
  const opex = parseFloat(monthlyOpex.replace(/,/g, "")) || 0;
  if (!opex) return "—";
  return Math.round(cash / opex).toString();
}

// Auto-promote income statement lines that cross Rick's threshold
// ±15% AND >$10K absolute — BOTH must be true
function autoPromoteVariances(
  revenue: LineItem,
  grossProfit: LineItem,
  opex: LineItem,
  netIncome: LineItem,
  existing: Variance[]
): Variance[] {
  const lines = [
    { account: "Revenue", li: revenue },
    { account: "Gross Profit", li: grossProfit },
    { account: "OpEx", li: opex },
    { account: "Net Income", li: netIncome },
  ];

  const promoted: Variance[] = [];

  for (const { account, li } of lines) {
    if (!li.actual || !li.budget) continue;
    const { varNum, pctNum } = calcVariance(li.actual, li.budget);
    const absVar = Math.abs(varNum);
    const absPct = Math.abs(pctNum);
    if (absVar > 10000 && absPct >= 15) {
      // Keep existing driver/options if already entered for this account
      const prev = existing.find((v) => v.account === account);
      promoted.push({
        account,
        actual: li.actual,
        budget: li.budget,
        driver: prev?.driver || "",
        options: prev?.options || "",
      });
    }
  }

  // Also keep any custom variance rows the user manually added (non-IS accounts)
  const isAccounts = new Set(["Revenue", "Gross Profit", "OpEx", "Net Income"]);
  const custom = existing.filter((v) => v.account && !isAccounts.has(v.account));

  return [...promoted, ...custom];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {children}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  filled,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  filled?: boolean;
  children: React.ReactNode;
}) {
  const highlight = required && !filled;
  return (
    <div className={highlight ? "rounded-lg border-2 border-amber-400 bg-amber-50 p-2.5 -mx-1" : ""}>
      <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
        <span className={highlight ? "text-amber-800" : "text-slate-600"}>{label}</span>
        {highlight && (
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Required
          </span>
        )}
        {hint && <span className="font-normal text-slate-400 ml-0.5">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

/** Format a raw number string as $1,234.56 — always 2 decimal places, no float noise */
function fmt(raw: string | null | undefined): string {
  if (!raw) return "—";
  const n = parseFloat(raw);
  if (isNaN(n)) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

const INPUT =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition";

const TEXTAREA =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition resize-none";

function LineItemRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LineItem;
  onChange: (val: LineItem) => void;
}) {
  const { variance, variancePct, varNum } = calcVariance(value.actual, value.budget);
  const isNeg = varNum < 0 && variance !== "—";
  const isPos = varNum > 0 && variance !== "—";

  // Flag indicator
  const { pctNum } = calcVariance(value.actual, value.budget);
  const flags = Math.abs(varNum) > 10000 && Math.abs(pctNum) >= 15;

  return (
    <div className="grid grid-cols-[110px_1fr_1fr_auto] items-center gap-2">
      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
        {label}
        {flags && (
          <span title="Exceeds ±15% AND >$10K — will be auto-flagged" className="text-orange-500 text-[10px]">⚑</span>
        )}
      </span>
      <div>
        <span className="block text-[10px] text-slate-400 mb-0.5">Actual ($)</span>
        <input
          type="text"
          placeholder="0.00"
          value={value.actual}
          onChange={(e) => onChange({ ...value, actual: e.target.value })}
          className={INPUT}
        />
      </div>
      <div>
        <span className="block text-[10px] text-slate-400 mb-0.5">Budget ($)</span>
        <input
          type="text"
          placeholder="0.00"
          value={value.budget}
          onChange={(e) => onChange({ ...value, budget: e.target.value })}
          className={INPUT}
        />
      </div>
      <div className="text-right min-w-[90px]">
        <span className="block text-[10px] text-slate-400 mb-0.5">Variance</span>
        <span className={`text-xs font-semibold ${isNeg ? "text-red-500" : isPos ? "text-emerald-600" : "text-slate-400"}`}>
          {variance}
        </span>
        {variancePct !== "—" && (
          <span className={`block text-[10px] ${isNeg ? "text-red-400" : isPos ? "text-emerald-500" : "text-slate-400"}`}>
            {variancePct}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Default State ──────────────────────────────────────────────────────────────

const emptyLine = (): LineItem => ({ actual: "", budget: "" });

const emptyVariance = (): Variance => ({
  account: "",
  actual: "",
  budget: "",
  driver: "",
  options: "",
});

const DEFAULT_STATE: FormState = {
  clientId: "",
  clientName: "",
  contactName: "",
  industry: "",
  format: "A",
  monthClosed: "",
  revenue: emptyLine(),
  grossProfit: emptyLine(),
  grossMarginActualPct: "",
  grossMarginBudgetPct: "",
  opex: emptyLine(),
  netIncome: emptyLine(),
  netMarginActualPct: "",
  netMarginBudgetPct: "",
  cashOnHand: "",
  monthlyOpex: "",
  cashRunway: "",
  currentRatio: "",
  accountsReceivable: "",
  totalLiabilities: "",
  payrollPctActual: "",
  payrollPctBudget: "",
  clientCount: "",
  variances: [],
  kpis: "",
  clientContext: "",
  toneNotes: "",
};

const TEAL = "#0d2b2a";

const TONE_PRESETS = [
  { label: "Confidence", value: "Good month — lean into confidence." },
  { label: "Steady", value: "Steady month — balanced and forward-looking." },
  { label: "Tough month", value: "Tough month — emphasize the fix and path forward." },
];

const FORMAT_OPTIONS = [
  { id: "A" as const, label: "A", sub: "CFO Commentary", desc: "Full P&L + multi-KPI" },
  { id: "B" as const, label: "B", sub: "Location/Segment", desc: "Multi-location clients" },
  { id: "C" as const, label: "C", sub: "Short Narrative", desc: "Light update / few variances" },
];

const INDUSTRIES = [
  "Dealership",
  "Home Services / Janitorial",
  "Health Tech",
  "SaaS / Tech",
  "Fitness / Wellness",
  "Real Estate",
  "Construction",
  "Professional Services",
  "Other",
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function FinanceAgent() {
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [roster, setRoster] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSaveClient, setShowSaveClient] = useState(false);

  // Excel upload state
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);
  const [parsedSheetNames, setParsedSheetNames] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-variance driver generation state
  const [driverLoading, setDriverLoading] = useState<Record<number, boolean>>({});
  const [driverError,   setDriverError]   = useState<Record<number, string>>({});

  // Load roster from localStorage on mount
  useEffect(() => {
    setRoster(loadRoster());
  }, []);

  // Auto-promote flagged variances whenever income statement changes
  useEffect(() => {
    const promoted = autoPromoteVariances(
      form.revenue,
      form.grossProfit,
      form.opex,
      form.netIncome,
      form.variances
    );
    // Only update if the promoted list has actually changed (avoids infinite loop)
    const promotedKey = JSON.stringify(promoted.map((v) => ({ account: v.account, actual: v.actual, budget: v.budget })));
    const existingKey = JSON.stringify(form.variances.map((v) => ({ account: v.account, actual: v.actual, budget: v.budget })));
    if (promotedKey !== existingKey) {
      setForm((f) => ({ ...f, variances: promoted }));
    }
  }, [form.revenue, form.grossProfit, form.opex, form.netIncome]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-populate KPI template when industry changes
  useEffect(() => {
    if (form.industry && KPI_TEMPLATES[form.industry] && !form.kpis) {
      setForm((f) => ({ ...f, kpis: KPI_TEMPLATES[form.industry] }));
    }
  }, [form.industry]); // eslint-disable-line react-hooks/exhaustive-deps

  const runway = calcRunway(form.cashOnHand, form.monthlyOpex);
  const runwayNum = parseFloat(runway);
  const runwayStatus =
    runway === "—" ? "neutral" : runwayNum < 3 ? "danger" : runwayNum <= 6 ? "ok" : "good";

  // Select a client from roster
  const selectClient = (id: string) => {
    const client = roster.find((c) => c.id === id);
    if (!client) {
      setForm((f) => ({ ...f, clientId: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      clientId: client.id,
      clientName: client.clientName,
      contactName: client.contactName,
      industry: client.industry,
      format: client.format,
      monthlyOpex: client.monthlyOpex,
      // Reset income data and output for new client
      revenue: emptyLine(),
      grossProfit: emptyLine(),
      opex: emptyLine(),
      netIncome: emptyLine(),
      cashOnHand: "",
      variances: [],
      kpis: KPI_TEMPLATES[client.industry] || "",
      clientContext: "",
      toneNotes: "",
    }));
    setOutput(null);
    setError(null);
  };

  // Save current client profile to roster
  const saveClient = () => {
    if (!form.clientName || !form.contactName) return;
    const existing = roster.find((c) => c.id === form.clientId);
    const id = existing?.id || `${Date.now()}`;
    const profile: ClientProfile = {
      id,
      clientName: form.clientName,
      contactName: form.contactName,
      industry: form.industry,
      format: form.format,
      monthlyOpex: form.monthlyOpex,
    };
    const updated = existing
      ? roster.map((c) => (c.id === id ? profile : c))
      : [...roster, profile];
    setRoster(updated);
    saveRoster(updated);
    setForm((f) => ({ ...f, clientId: id }));
    setShowSaveClient(false);
  };

  const deleteClient = (id: string) => {
    const updated = roster.filter((c) => c.id !== id);
    setRoster(updated);
    saveRoster(updated);
    if (form.clientId === id) {
      setForm(DEFAULT_STATE);
      setOutput(null);
    }
  };

  const updateVariance = useCallback((i: number, patch: Partial<Variance>) => {
    setForm((f) => {
      const v = [...f.variances];
      v[i] = { ...v[i], ...patch };
      return { ...f, variances: v };
    });
  }, []);

  const addCustomVariance = () => {
    setForm((f) => ({ ...f, variances: [...f.variances, emptyVariance()] }));
  };

  const removeVariance = (i: number) => {
    setForm((f) => ({ ...f, variances: f.variances.filter((_, idx) => idx !== i) }));
  };

  const handleExcelFile = useCallback(async (file: File) => {
    if (!file) return;
    setParseLoading(true);
    setParseError(null);
    setParsedFileName(null);

    try {
      // Send the file directly to the parser — no Claude needed for extraction
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-financials", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const d = json.data;

      // Auto-populate form with extracted data
      setForm((f) => ({
        ...f,
        clientName:          d.clientName          ?? f.clientName,
        monthClosed:         d.monthClosed         ?? f.monthClosed,
        cashOnHand:          d.cashOnHand          ?? f.cashOnHand,
        monthlyOpex:         d.monthlyOpex         ?? f.monthlyOpex,
        cashRunway:          d.cashRunway          ?? f.cashRunway,
        currentRatio:        d.currentRatio        ?? f.currentRatio,
        accountsReceivable:  d.accountsReceivable  ?? f.accountsReceivable,
        totalLiabilities:    d.totalLiabilities    ?? f.totalLiabilities,
        payrollPctActual:    d.payrollPctActual    ?? f.payrollPctActual,
        payrollPctBudget:    d.payrollPctBudget    ?? f.payrollPctBudget,
        clientCount:         d.clientCount         ?? f.clientCount,
        grossMarginActualPct: d.grossMarginActualPct ?? f.grossMarginActualPct,
        grossMarginBudgetPct: d.grossMarginBudgetPct ?? f.grossMarginBudgetPct,
        netMarginActualPct:  d.netMarginActualPct  ?? f.netMarginActualPct,
        netMarginBudgetPct:  d.netMarginBudgetPct  ?? f.netMarginBudgetPct,
        revenue: {
          actual: d.revenue?.actual ? String(Math.round(Number(d.revenue.actual))) : f.revenue.actual,
          budget: d.revenue?.budget ? String(Math.round(Number(d.revenue.budget))) : f.revenue.budget,
        },
        grossProfit: {
          actual: d.grossProfit?.actual ? String(Math.round(Number(d.grossProfit.actual))) : f.grossProfit.actual,
          budget: d.grossProfit?.budget ? String(Math.round(Number(d.grossProfit.budget))) : f.grossProfit.budget,
        },
        opex: {
          actual: d.opex?.actual ? String(Math.round(Number(d.opex.actual))) : f.opex.actual,
          budget: d.opex?.budget ? String(Math.round(Number(d.opex.budget))) : f.opex.budget,
        },
        netIncome: {
          actual: d.netIncome?.actual ? String(Math.round(Number(d.netIncome.actual))) : f.netIncome.actual,
          budget: d.netIncome?.budget ? String(Math.round(Number(d.netIncome.budget))) : f.netIncome.budget,
        },
        kpis: d.kpisRaw
          ? [
              d.kpisRaw,
              d.grossMarginActualPct   ? `Gross Margin: ${d.grossMarginActualPct} (Plan: ${d.grossMarginBudgetPct ?? "—"})` : null,
              d.netMarginActualPct     ? `Net Margin: ${d.netMarginActualPct} (Plan: ${d.netMarginBudgetPct ?? "—"})` : null,
              d.payrollPctActual       ? `Payroll % of Revenue: ${d.payrollPctActual} (Plan: ${d.payrollPctBudget ?? "—"})` : null,
              d.clientCount            ? `Client Count: ${d.clientCount}` : null,
              d.currentRatio           ? `Current Ratio: ${d.currentRatio}` : null,
              d.accountsReceivable     ? `Accounts Receivable: $${Math.round(Number(d.accountsReceivable)).toLocaleString()}` : null,
              d.totalLiabilities       ? `Total Liabilities: $${Math.round(Number(d.totalLiabilities)).toLocaleString()}` : null,
              d.cashRunway             ? `Cash Runway: ${d.cashRunway} months` : null,
            ].filter(Boolean).join("\n")
          : f.kpis,
        // Merge in any sub-account variances Claude found
        variances: [
          ...f.variances,
          ...(d.additionalVariances ?? []).map((v: { account: string; actual: string; budget: string; variancePct?: string; driver?: string }) => ({
            account: v.account,
            actual:  v.actual  ? String(Math.round(Number(v.actual)))  : "",
            budget:  v.budget  ? String(Math.round(Number(v.budget)))  : "",
            driver:  v.driver  ?? "",
            options: "",
          })),
        ],
      }));

      setParsedFileName(file.name);
      setParsedSheetNames(json.sheetNames ?? []);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setParseLoading(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleExcelFile(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleExcelFile(file);
  };

  const handleGenerateDrivers = async (i: number) => {
    const v = form.variances[i];
    setDriverLoading((d) => ({ ...d, [i]: true }));
    setDriverError((d) => ({ ...d, [i]: "" }));
    try {
      const { variance, variancePct } = calcVariance(v.actual, v.budget);
      const res = await fetch("/api/generate-drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account:       v.account,
          actual:        v.actual,
          budget:        v.budget,
          variancePct:   `${variance} (${variancePct}%)`,
          industry:      form.industry,
          clientContext: form.clientContext,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      updateVariance(i, { driver: data.driver, options: data.options });
    } catch (err) {
      setDriverError((d) => ({ ...d, [i]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setDriverLoading((d) => ({ ...d, [i]: false }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setOutput(null);
    setError(null);

    try {
      const buildLine = (li: LineItem) => {
        const { variance, variancePct } = calcVariance(li.actual, li.budget);
        return { actual: li.actual, budget: li.budget, variance, variancePct };
      };

      const payload = {
        clientName: form.clientName,
        contactName: form.contactName,
        industry: form.industry,
        format: form.format,
        monthClosed: form.monthClosed,
        revenue: buildLine(form.revenue),
        grossProfit: buildLine(form.grossProfit),
        grossMarginActualPct: form.grossMarginActualPct,
        grossMarginBudgetPct: form.grossMarginBudgetPct,
        opex: buildLine(form.opex),
        netIncome: buildLine(form.netIncome),
        netMarginActualPct: form.netMarginActualPct,
        netMarginBudgetPct: form.netMarginBudgetPct,
        cashOnHand: form.cashOnHand,
        monthlyOpex: form.monthlyOpex,
        runway,
        currentRatio: form.currentRatio,
        accountsReceivable: form.accountsReceivable,
        totalLiabilities: form.totalLiabilities,
        payrollPctActual: form.payrollPctActual,
        payrollPctBudget: form.payrollPctBudget,
        clientCount: form.clientCount,
        variances: form.variances
          .filter((v) => v.account.trim())
          .map((v) => {
            const { variance, variancePct } = calcVariance(v.actual, v.budget);
            return { ...v, variance, variancePct };
          }),
        kpis: form.kpis,
        clientContext: form.clientContext,
        toneNotes: form.toneNotes,
      };

      const res = await fetch("/api/finance-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.email);

      // Auto-update saved monthlyOpex for this client if it changed
      if (form.clientId && form.monthlyOpex) {
        const updated = roster.map((c) =>
          c.id === form.clientId ? { ...c, monthlyOpex: form.monthlyOpex } : c
        );
        setRoster(updated);
        saveRoster(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setForm(DEFAULT_STATE);
    setOutput(null);
    setError(null);
  };

  const isAutoPromoted = (account: string) =>
    ["Revenue", "Gross Profit", "OpEx", "Net Income"].includes(account);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">MEC Commentary Agent</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload the ops plan → fill in highlighted fields → generate.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-slate-600 transition underline underline-offset-2 mt-1"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* ── LEFT: Input Form ─────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* ── 0. Excel Upload ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <SectionHeader>Upload Close File</SectionHeader>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition px-6 py-8 ${
                dragOver
                  ? "border-teal-500 bg-teal-50"
                  : parseLoading
                  ? "border-slate-200 bg-slate-50 cursor-wait"
                  : parsedFileName
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileInput}
              />

              {parseLoading ? (
                <>
                  <svg className="h-8 w-8 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <p className="text-sm font-semibold text-teal-700">Reading the file…</p>
                  <p className="text-xs text-slate-400">Claude is pulling the numbers</p>
                </>
              ) : parsedFileName ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">Numbers loaded</p>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{parsedFileName}</p>
                  <p className="text-[10px] text-slate-400">Click or drop a new file to replace</p>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Drop the close file here</p>
                  <p className="text-xs text-slate-400">or click to browse — .xlsx, .xls, .csv</p>
                  <p className="text-[10px] text-slate-300 mt-1">Upload the full ops plan — agent reads the MBR tab automatically</p>
                </>
              )}
            </div>

            {parseError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-xs font-bold text-red-600 mb-0.5">Could not read file</p>
                <p className="text-xs text-red-500">{parseError}</p>
              </div>
            )}

            {parsedFileName && !parseLoading && (
              form.revenue.actual ? (
                <p className="text-[10px] text-slate-400 text-center">
                  Numbers loaded — review below, then fill in context and generate.
                </p>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center">
                  <p className="text-xs font-semibold text-amber-700">No income statement data found in this file.</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Tabs found: {parsedSheetNames.join(", ") || "none"}
                  </p>
                  <p className="text-[10px] text-amber-500 mt-0.5">The parser looks for a tab named MBR, P&L, IS, Financials, or Budget vs Actual.</p>
                </div>
              )
            )}
          </div>

          {/* ── 1. Client Roster ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <SectionHeader>Client</SectionHeader>

            {roster.length > 0 && (
              <Field label="Select saved client">
                <select
                  value={form.clientId}
                  onChange={(e) => selectClient(e.target.value)}
                  className={INPUT}
                >
                  <option value="">— New client —</option>
                  {roster.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.contactName})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Client fields — editable whether new or from roster */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Name">
                <input
                  type="text"
                  placeholder="Auto-filled from file"
                  value={form.clientName}
                  onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value, clientId: "" }))}
                  className={INPUT}
                />
              </Field>
              <Field label="Contact First Name" hint="salutation" required filled={!!form.contactName}>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Industry" required filled={!!form.industry}>
                <select
                  value={form.industry}
                  onChange={(e) => {
                    const ind = e.target.value;
                    setForm((f) => ({
                      ...f,
                      industry: ind,
                      kpis: KPI_TEMPLATES[ind] || f.kpis,
                    }));
                  }}
                  className={INPUT}
                >
                  <option value="">Select…</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Month Closed">
                <input
                  type="text"
                  placeholder="May 2026"
                  value={form.monthClosed}
                  onChange={(e) => setForm((f) => ({ ...f, monthClosed: e.target.value }))}
                  className={INPUT}
                />
              </Field>
            </div>

            {/* Format */}
            <Field label="Format" required filled={!!form.format}>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setForm((f) => ({ ...f, format: opt.id }))}
                    className={`rounded-lg border-2 p-2.5 text-left transition ${
                      form.format === opt.id
                        ? "border-teal-700 bg-teal-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`text-xs font-bold ${form.format === opt.id ? "text-teal-800" : "text-slate-700"}`}>
                      {opt.label} — {opt.sub}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${form.format === opt.id ? "text-teal-600" : "text-slate-400"}`}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            {/* Save / manage roster */}
            <div className="flex items-center gap-3 pt-1">
              {!showSaveClient ? (
                <button
                  onClick={() => setShowSaveClient(true)}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition underline underline-offset-2"
                >
                  {form.clientId ? "Update saved client" : "Save as client"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Save <strong>{form.clientName}</strong> to roster?
                  </span>
                  <button
                    onClick={saveClient}
                    className="rounded bg-teal-700 px-3 py-1 text-xs font-bold text-white hover:bg-teal-800 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSaveClient(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {form.clientId && (
                <button
                  onClick={() => deleteClient(form.clientId)}
                  className="text-xs text-red-400 hover:text-red-600 transition ml-auto"
                >
                  Remove from roster
                </button>
              )}
            </div>
          </div>

          {/* ── 2. Income Statement (read-only — populated from Excel) ──── */}
          {parsedFileName ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <SectionHeader>Income Statement</SectionHeader>
              <p className="text-[10px] text-slate-400 -mt-1 mb-1">
                Pulled from <span className="font-medium text-slate-500">{parsedFileName}</span>. ⚑ = crosses Rick&apos;s flag threshold.
              </p>
              {[
                { label: "Revenue",      value: form.revenue },
                { label: "Gross Profit", value: form.grossProfit },
                { label: "OpEx",         value: form.opex },
                { label: "Net Income",   value: form.netIncome },
              ].map(({ label, value }) => {
                const { variance, variancePct, varNum, pctNum } = calcVariance(value.actual, value.budget);
                const isNeg   = varNum < 0 && variance !== "—";
                const isPos   = varNum > 0 && variance !== "—";
                const flags   = Math.abs(varNum) > 10000 && Math.abs(pctNum) >= 15;
                const hasData = value.actual || value.budget;
                return (
                  <div key={label} className={`grid grid-cols-[110px_1fr_1fr_auto] items-center gap-2 rounded-lg px-3 py-2 ${flags ? "bg-orange-50 border border-orange-100" : "bg-slate-50"}`}>
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      {label}
                      {flags && <span className="text-orange-500 text-[10px]" title="Exceeds ±15% AND >$10K">⚑</span>}
                    </span>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Actual</span>
                      <span className={`text-sm font-semibold ${hasData ? "text-slate-800" : "text-slate-300"}`}>
                        {hasData ? fmt(value.actual) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Budget</span>
                      <span className={`text-sm font-semibold ${value.budget ? "text-slate-800" : "text-slate-300"}`}>
                        {fmt(value.budget)}
                      </span>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <span className="block text-[10px] text-slate-400 mb-0.5">Variance</span>
                      <span className={`text-xs font-semibold ${isNeg ? "text-red-500" : isPos ? "text-emerald-600" : "text-slate-300"}`}>
                        {variance}
                      </span>
                      {variancePct !== "—" && (
                        <span className={`block text-[10px] ${isNeg ? "text-red-400" : isPos ? "text-emerald-500" : "text-slate-300"}`}>
                          {variancePct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-xs font-semibold text-slate-400">Income Statement</p>
              <p className="text-[11px] text-slate-300 mt-1">Upload the close file above to populate</p>
            </div>
          )}

          {/* ── 3. Cash Position ─────────────────────────────────────────── */}
          {parsedFileName ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <SectionHeader>Cash Position</SectionHeader>
              <div className="grid grid-cols-2 gap-3">
                {/* Cash on Hand — read-only if found, editable if not */}
                {form.cashOnHand ? (
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <span className="block text-[10px] font-semibold text-slate-400 mb-1">Cash on Hand</span>
                    <span className="text-lg font-extrabold text-slate-800">{fmt(form.cashOnHand)}</span>
                  </div>
                ) : (
                  <Field label="Cash on Hand ($)" required filled={!!form.cashOnHand} hint="not found in file — enter manually">
                    <input
                      type="text"
                      placeholder="e.g. 579793"
                      value={form.cashOnHand}
                      onChange={(e) => setForm((f) => ({ ...f, cashOnHand: e.target.value }))}
                      className={INPUT}
                    />
                  </Field>
                )}
                {/* Monthly OpEx — read-only if found, editable if not */}
                {form.monthlyOpex ? (
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <span className="block text-[10px] font-semibold text-slate-400 mb-1">Monthly OpEx (avg)</span>
                    <span className="text-lg font-extrabold text-slate-800">{fmt(form.monthlyOpex)}</span>
                  </div>
                ) : (
                  <Field label="Monthly OpEx Avg ($)" required filled={!!form.monthlyOpex} hint="not found in file — enter manually">
                    <input
                      type="text"
                      placeholder="e.g. 429332"
                      value={form.monthlyOpex}
                      onChange={(e) => setForm((f) => ({ ...f, monthlyOpex: e.target.value }))}
                      className={INPUT}
                    />
                  </Field>
                )}
              </div>

              <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${
                runwayStatus === "danger" ? "bg-red-50 border border-red-200" :
                runwayStatus === "ok"     ? "bg-amber-50 border border-amber-200" :
                runwayStatus === "good"   ? "bg-emerald-50 border border-emerald-200" :
                "bg-slate-50 border border-slate-200"
              }`}>
                <span className="text-xs font-semibold text-slate-600">Cash Runway</span>
                <div className="text-right">
                  <span className={`text-lg font-extrabold ${
                    runwayStatus === "danger" ? "text-red-600" :
                    runwayStatus === "ok"     ? "text-amber-600" :
                    runwayStatus === "good"   ? "text-emerald-700" : "text-slate-400"
                  }`}>
                    {runway === "—" ? "—" : `${runway} mo`}
                  </span>
                  {runwayStatus === "danger" && <p className="text-[10px] text-red-500 font-semibold">⚠ Below 3-month floor — flag immediately</p>}
                  {runwayStatus === "ok"     && <p className="text-[10px] text-amber-600">3–6 months — healthy range</p>}
                  {runwayStatus === "good"   && <p className="text-[10px] text-emerald-600">&gt;6 months — strong position</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-xs font-semibold text-slate-400">Cash Position</p>
              <p className="text-[11px] text-slate-300 mt-1">Upload the close file above to populate</p>
            </div>
          )}

          {/* ── 4. Flagged Variances (auto-promoted + driver/options only) ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <SectionHeader>Flagged Variances</SectionHeader>

            {form.variances.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">
                No lines cross Rick&apos;s threshold yet (±15% AND &gt;$10K).<br />
                They&apos;ll appear automatically once the income statement qualifies.
              </p>
            )}

            {form.variances.map((v, i) => {
              const auto = isAutoPromoted(v.account);
              return (
                <div key={i} className={`rounded-lg border p-4 space-y-3 ${auto ? "border-orange-100 bg-orange-50/40" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {auto && <span className="text-orange-400 text-xs">⚑</span>}
                      <span className="text-xs font-bold text-slate-700">{v.account || `Variance ${i + 1}`}</span>
                      {auto && (
                        <span className="text-[10px] text-orange-500 font-medium bg-orange-100 rounded px-1.5 py-0.5">
                          auto-flagged
                        </span>
                      )}
                    </div>
                    {!auto && (
                      <button onClick={() => removeVariance(i)} className="text-[10px] text-red-400 hover:text-red-600 transition">
                        Remove
                      </button>
                    )}
                  </div>

                  {/* For auto-promoted rows, show read-only numbers */}
                  {auto ? (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] mb-0.5">Actual</span>
                        <span className="font-semibold text-slate-700">{fmt(v.actual)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] mb-0.5">Budget</span>
                        <span className="font-semibold text-slate-700">{fmt(v.budget)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] mb-0.5">Variance</span>
                        {(() => {
                          const { variance, variancePct, varNum } = calcVariance(v.actual, v.budget);
                          return (
                            <span className={`font-semibold ${varNum < 0 ? "text-red-500" : "text-emerald-600"}`}>
                              {variance} ({variancePct}%)
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Account">
                        <input type="text" placeholder="e.g. Labor" value={v.account} onChange={(e) => updateVariance(i, { account: e.target.value })} className={INPUT} />
                      </Field>
                      <Field label="Actual ($)">
                        <input type="text" placeholder="0.00" value={v.actual} onChange={(e) => updateVariance(i, { actual: e.target.value })} className={INPUT} />
                      </Field>
                      <Field label="Budget ($)">
                        <input type="text" placeholder="0.00" value={v.budget} onChange={(e) => updateVariance(i, { budget: e.target.value })} className={INPUT} />
                      </Field>
                    </div>
                  )}

                  {/* Driver + Options — always editable, with Suggest button */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-600">
                        Driver <span className="font-normal text-slate-400">(what caused it)</span>
                      </label>
                      <button
                        onClick={() => handleGenerateDrivers(i)}
                        disabled={driverLoading[i]}
                        className="flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 hover:bg-teal-100 transition disabled:opacity-50"
                      >
                        {driverLoading[i] ? (
                          <>
                            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            Thinking…
                          </>
                        ) : (
                          <>✦ Suggest</>
                        )}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 3 emergency subcontractor call-outs on commercial jobs"
                      value={v.driver}
                      onChange={(e) => updateVariance(i, { driver: e.target.value })}
                      className={INPUT}
                    />
                    {driverError[i] && <p className="text-[10px] text-red-500">{driverError[i]}</p>}
                  </div>
                  <Field label="Options" hint="2–3 corrective paths">
                    <textarea
                      rows={3}
                      placeholder="1. Tighten scheduling buffer  2. Renegotiate sub rates  3. Add contingency line to budget"
                      value={v.options}
                      onChange={(e) => updateVariance(i, { options: e.target.value })}
                      className={TEXTAREA}
                    />
                  </Field>
                </div>
              );
            })}

            <button
              onClick={addCustomVariance}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition underline underline-offset-2"
            >
              + Add sub-account variance
            </button>
          </div>

          {/* ── 5. Context ───────────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <SectionHeader>Context</SectionHeader>

            <Field label="Industry KPIs" hint="pre-filled from industry — edit as needed">
              <textarea
                rows={4}
                value={form.kpis}
                onChange={(e) => setForm((f) => ({ ...f, kpis: e.target.value }))}
                className={TEXTAREA}
              />
            </Field>

            <Field label="Client Context" hint="deals, hires, initiatives Rick should weave in">
              <textarea
                rows={2}
                placeholder="VP of Ops starts June 1. Renewal with anchor client still pending."
                value={form.clientContext}
                onChange={(e) => setForm((f) => ({ ...f, clientContext: e.target.value }))}
                className={TEXTAREA}
              />
            </Field>

            {/* Tone — quick-select buttons */}
            <Field label="Tone">
              <div className="flex gap-2 flex-wrap mt-1">
                {TONE_PRESETS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        toneNotes: f.toneNotes === t.value ? "" : t.value,
                      }))
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                      form.toneNotes === t.value
                        ? "border-teal-600 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Generate */}
          {(() => {
            const missing: string[] = [];
            if (!parsedFileName) missing.push("upload the ops plan");
            if (!form.contactName) missing.push("contact first name");
            if (!form.industry) missing.push("industry");
            const ready = missing.length === 0;
            return (
              <div className="space-y-2">
                {!ready && !loading && (
                  <p className="text-center text-xs text-amber-600 font-medium">
                    Still needed: {missing.join(" · ")}
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={loading || !ready}
                  style={loading || !ready ? {} : { backgroundColor: TEAL }}
                  className={`w-full rounded-xl py-4 text-sm font-bold tracking-wide transition shadow-md ${
                    loading || !ready
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "text-white hover:opacity-90 active:scale-[0.99]"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Rick is writing…
                    </span>
                  ) : (
                    "Generate Email Draft →"
                  )}
                </button>
              </div>
            );
          })()}
        </div>

        {/* ── RIGHT: Output ────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-[72px] lg:self-start space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: TEAL }}>
              <div>
                <span className="text-sm font-bold text-white">Email Draft</span>
                <span className="ml-2 text-[10px] text-white/40 font-medium uppercase tracking-wider">Rick&apos;s voice</span>
              </div>
              {output && (
                <button
                  onClick={handleCopy}
                  className="rounded-md bg-white/10 hover:bg-white/20 transition px-3 py-1 text-xs font-semibold text-white"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>

            <div className="p-5 min-h-[400px]">
              {!output && !loading && !error && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="text-4xl mb-3">✉</div>
                  <p className="text-sm font-semibold text-slate-400">Fill in the close data and hit Generate.</p>
                  <p className="text-xs text-slate-300 mt-1">Rick writes. You review. Done.</p>
                </div>
              )}
              {loading && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="text-4xl mb-3 animate-pulse">🧠</div>
                  <p className="text-sm font-semibold text-slate-500">Rick is looking at the numbers…</p>
                  <p className="text-xs text-slate-300 mt-1">Usually 15–30 seconds</p>
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-xs font-bold text-red-600 mb-1">Error</p>
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}
              {output && (
                <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans leading-relaxed">
                  {output}
                </pre>
              )}
            </div>
          </div>

          {/* Framework reminder */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Rick&apos;s Rules</p>
            <ul className="space-y-1">
              {[
                "Flag: ±15% AND >$10K — both required",
                "Cash floor: 3–6 months of monthly OpEx",
                "Walk: Revenue → Gross Margin → OpEx → NOI → Net",
                "Oreo: Good news → Problem + Fix → Forward action",
                "Never alarm without a corrective path",
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                  <span className="mt-0.5 text-orange-400 flex-shrink-0">›</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
