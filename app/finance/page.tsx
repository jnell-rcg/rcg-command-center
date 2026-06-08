import type { Metadata } from "next";
import { FinanceAgent } from "@/components/FinanceAgent";
import Image from "next/image";

export const metadata: Metadata = {
  title: "RCG Finance Agent",
  description: "Month-end close narrative generator — Robyn Consulting Group",
};

const TEAL = "#0d2b2a";

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Standalone header */}
      <header className="sticky top-0 z-20 shadow-lg" style={{ backgroundColor: TEAL }}>
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">

          {/* Brand lockup */}
          <div className="flex items-center gap-3 pr-5 border-r border-white/10">
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
                Finance Agent
              </div>
            </div>
          </div>

          {/* Page title */}
          <div className="ml-5">
            <span className="text-sm font-semibold text-white">Month-End Close</span>
            <span className="ml-2 text-[10px] text-white/40 font-medium uppercase tracking-widest">
              → Client Email Draft
            </span>
          </div>

          {/* Nav links */}
          <div className="ml-auto flex items-center gap-2">
            <a href="/" className="rounded-md bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs font-semibold text-white">Ops Tower</a>
            <a href="/interview-prep" className="rounded-md bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs font-semibold text-white">Interview Prep</a>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-sm ml-2">R</div>
          </div>

        </div>
      </header>

      <main>
        <FinanceAgent />
      </main>
    </div>
  );
}
