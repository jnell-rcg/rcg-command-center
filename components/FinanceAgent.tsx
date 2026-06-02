"use client";

import { useState, useCallback, useEffect } from "react";

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
  opex: LineItem;
  netIncome: LineItem;
  cashOnHand: string;
  monthlyOpex: string;
  variances: Variance[]; // auto-promoted from income statement; user adds driver + options
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
    variance: `${sign}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    variancePct: `${sign}${pct.toFixed(1)}`,
    varNum: v,
    pctNum: pct,
  };
}

function calcRunway(cashOnHand: string, monthlyOpex: string) {
  const cash = parseFloat(cashOnHand.replace(/,/g, "")) || 0;
  const opex = parseFloat(monthlyOpex.replace(/,/g, "")) || 0;
  if (!opex) return "—";
  return (cash / opex).toFixed(1);
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
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {hint && <span className="font-normal text-slate-400 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
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
  opex: emptyLine(),
  netIncome: emptyLine(),
  cashOnHand: "",
  monthlyOpex: "",
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
        opex: buildLine(form.opex),
        netIncome: buildLine(form.netIncome),
        cashOnHand: form.cashOnHand,
        monthlyOpex: form.monthlyOpex,
        runway,
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Finance Agent</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pick a client, enter close numbers, generate the email.
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
                  placeholder="SealX"
                  value={form.clientName}
                  onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value, clientId: "" }))}
                  className={INPUT}
                />
              </Field>
              <Field label="Contact First Name" hint="salutation">
                <input
                  type="text"
                  placeholder="Alex"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Industry">
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
            <Field label="Format">
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

          {/* ── 2. Income Statement ──────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <SectionHeader>Income Statement</SectionHeader>
            <p className="text-[10px] text-slate-400 -mt-1 mb-2">
              Raw numbers, no $ needed. ⚑ means Rick&apos;s threshold is crossed — those lines auto-populate below.
            </p>
            <LineItemRow label="Revenue" value={form.revenue} onChange={(v) => setForm((f) => ({ ...f, revenue: v }))} />
            <LineItemRow label="Gross Profit" value={form.grossProfit} onChange={(v) => setForm((f) => ({ ...f, grossProfit: v }))} />
            <LineItemRow label="OpEx" value={form.opex} onChange={(v) => setForm((f) => ({ ...f, opex: v }))} />
            <LineItemRow label="Net Income" value={form.netIncome} onChange={(v) => setForm((f) => ({ ...f, netIncome: v }))} />
          </div>

          {/* ── 3. Cash ──────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <SectionHeader>Cash Position</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cash on Hand ($)">
                <input
                  type="text"
                  placeholder="250000"
                  value={form.cashOnHand}
                  onChange={(e) => setForm((f) => ({ ...f, cashOnHand: e.target.value }))}
                  className={INPUT}
                />
              </Field>
              <Field label="Monthly OpEx Avg ($)">
                <input
                  type="text"
                  placeholder="65000"
                  value={form.monthlyOpex}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyOpex: e.target.value }))}
                  className={INPUT}
                />
              </Field>
            </div>

            <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${
              runwayStatus === "danger" ? "bg-red-50 border border-red-200" :
              runwayStatus === "ok" ? "bg-amber-50 border border-amber-200" :
              runwayStatus === "good" ? "bg-emerald-50 border border-emerald-200" :
              "bg-slate-50 border border-slate-200"
            }`}>
              <span className="text-xs font-semibold text-slate-600">Cash Runway</span>
              <div className="text-right">
                <span className={`text-lg font-extrabold ${
                  runwayStatus === "danger" ? "text-red-600" :
                  runwayStatus === "ok" ? "text-amber-600" :
                  runwayStatus === "good" ? "text-emerald-700" : "text-slate-400"
                }`}>
                  {runway === "—" ? "—" : `${runway} mo`}
                </span>
                {runwayStatus === "danger" && <p className="text-[10px] text-red-500 font-semibold">⚠ Below 3-month floor — flag immediately</p>}
                {runwayStatus === "ok" && <p className="text-[10px] text-amber-600">3–6 months — healthy range</p>}
                {runwayStatus === "good" && <p className="text-[10px] text-emerald-600">&gt;6 months — strong position</p>}
              </div>
            </div>
          </div>

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
                        <span className="font-semibold text-slate-700">${v.actual}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] mb-0.5">Budget</span>
                        <span className="font-semibold text-slate-700">${v.budget}</span>
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

                  {/* Driver + Options — always editable */}
                  <Field label="Driver" hint="what caused it">
                    <input
                      type="text"
                      placeholder="e.g. 3 emergency subcontractor call-outs on commercial jobs"
                      value={v.driver}
                      onChange={(e) => updateVariance(i, { driver: e.target.value })}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Options" hint="2–3 corrective paths">
                    <textarea
                      rows={2}
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
          <button
            onClick={handleSubmit}
            disabled={loading || !form.clientName || !form.contactName}
            style={loading || !form.clientName || !form.contactName ? {} : { backgroundColor: TEAL }}
            className={`w-full rounded-xl py-4 text-sm font-bold tracking-wide transition shadow-md ${
              loading || !form.clientName || !form.contactName
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
