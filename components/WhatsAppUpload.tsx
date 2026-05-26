"use client";

import { useRef, useState } from "react";

interface Props {
  onPending: (id: string) => void;
}

const DAY_OPTIONS = [7, 14, 30, 60, 90];

export function WhatsAppUpload({ onPending }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setQueued(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("days", String(days));

    try {
      const res = await fetch("/api/whatsapp", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onPending(data.id);
      setQueued(file.name);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 w-fit">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleChange}
          className="hidden"
          id="whatsapp-upload"
          disabled={loading}
        />
        <label
          htmlFor="whatsapp-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-100"
        >
          {/* WhatsApp-ish phone icon */}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {loading ? "Uploading…" : "Upload WhatsApp Export"}
        </label>

        {/* Days selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Last</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-rcg-500"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {queued && (
        <p className="text-xs text-green-600">✓ &ldquo;{queued}&rdquo; queued — last {days} days being classified</p>
      )}

    </div>
  );
}
