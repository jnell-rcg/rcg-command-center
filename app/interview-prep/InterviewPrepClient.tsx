"use client";

import ReactMarkdown from "react-markdown";
import Image from "next/image";

const TEAL = "#0d2b2a";

export default function InterviewPrepClient({
  content,
  error,
}: {
  content: string;
  error: string;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 shadow-lg" style={{ backgroundColor: TEAL }}>
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3">
          <div className="flex items-center gap-3 pr-5 border-r border-white/10">
            <div className="rounded-lg bg-white p-1 shadow-sm flex-shrink-0">
              <Image src="/rcg-birdy.jpg" alt="RCG" width={32} height={32} className="h-8 w-8 object-contain" />
            </div>
            <div className="leading-none">
              <div className="text-xl font-extrabold tracking-tight text-white">RCG</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-orange-400 mt-0.5">
                Finance Agent
              </div>
            </div>
          </div>

          <div className="ml-5">
            <span className="text-sm font-semibold text-white">Rick Interview Prep</span>
            <span className="ml-2 text-[10px] text-white/40 font-medium uppercase tracking-widest">
              → Voice Gaps + Questions
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {content && (
              <button onClick={handleCopy} className="rounded-md bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs font-semibold text-white">
                Copy Markdown
              </button>
            )}
            <a href="/" className="rounded-md bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs font-semibold text-white">Ops Tower</a>
            <a href="/finance" className="rounded-md bg-orange-500 hover:bg-orange-600 transition px-3 py-1.5 text-xs font-semibold text-white">Finance Agent</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-bold text-red-600 mb-1">Could not load interview prep file</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 prose prose-slate max-w-none
            prose-h1:text-2xl prose-h1:font-extrabold prose-h1:text-slate-900
            prose-h2:text-lg prose-h2:font-bold prose-h2:text-slate-800 prose-h2:mt-8 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2
            prose-h3:text-sm prose-h3:font-bold prose-h3:text-teal-800 prose-h3:uppercase prose-h3:tracking-wide
            prose-p:text-sm prose-p:text-slate-700 prose-p:leading-relaxed
            prose-li:text-sm prose-li:text-slate-700
            prose-strong:text-slate-900
            prose-blockquote:border-l-4 prose-blockquote:border-orange-400 prose-blockquote:bg-orange-50 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:not-italic
            prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded
            prose-hr:border-slate-200
            prose-table:text-sm
            prose-th:bg-slate-50 prose-th:font-semibold prose-th:text-slate-700
            prose-td:text-slate-600
          ">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-300 mt-6">
          Source: ~/.claude/projects/.../memory/rcg-rick-interview-prep.md · Updates automatically as closes are processed
        </p>
      </main>
    </div>
  );
}
