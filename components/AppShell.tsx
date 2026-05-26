"use client";

import Image from "next/image";
import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { EOS } from "./EOS";

type Tab = "ops" | "eos";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "ops", label: "Ops Pulse",  sub: "Daily operations" },
  { id: "eos", label: "RCG EOS",   sub: "Rocks · Issues · Scorecard" },
];

// RCG dark teal — used as inline style so it always renders regardless of Tailwind cache
const TEAL = "#0d2b2a";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("ops");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 shadow-lg" style={{ backgroundColor: TEAL }}>
        <div className="mx-auto flex max-w-5xl items-center px-4">

          {/* Brand lockup */}
          <div className="flex items-center gap-3 py-3 pr-5 border-r border-white/10 flex-shrink-0">
            <div className="rounded-lg bg-white p-1 shadow-sm flex-shrink-0">
              <Image
                src="/rcg-birdy.jpg"
                alt="RCG"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="leading-none">
              <div className="text-xl font-extrabold tracking-tight text-white">RCG</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-orange-400 mt-0.5">
                Ops Tower
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 ml-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="group relative flex flex-col items-start px-3 py-3 text-left transition"
              >
                <span className={`text-sm font-semibold transition ${
                  tab === t.id ? "text-white" : "text-white/50 group-hover:text-white/80"
                }`}>
                  {t.label}
                </span>
                <span className={`text-[10px] transition ${
                  tab === t.id ? "text-white/40" : "text-white/25 group-hover:text-white/35"
                }`}>
                  {t.sub}
                </span>
                {tab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-orange-500" />
                )}
              </button>
            ))}
          </nav>

          {/* Janelle avatar — right side */}
          <div className="ml-auto flex items-center gap-2 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-sm">
              J
            </div>
            <span className="text-sm font-semibold text-white">Janelle</span>
          </div>

        </div>
      </header>

      <main>
        {tab === "ops" && <Dashboard />}
        {tab === "eos" && <EOS />}
      </main>
    </div>
  );
}
