"use client";

import { useRef, useState } from "react";

interface Props {
  onPending: (id: string) => void;
}

export function FathomUpload({ onPending }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setQueued(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/fathom", { method: "POST", body: formData });
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          onChange={handleChange}
          className="hidden"
          id="fathom-upload"
          disabled={loading}
        />
        <label
          htmlFor="fathom-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {loading ? "Uploading…" : "Upload Fathom Transcript"}
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {queued && (
        <p className="text-xs text-green-600">✓ &ldquo;{queued}&rdquo; queued for classification — will appear shortly</p>
      )}
    </div>
  );
}
