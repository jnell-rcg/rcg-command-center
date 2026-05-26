"use client";

import { useRef, useState } from "react";

interface Props {
  onPending: (id: string) => void;
}

export function SlackUpload({ onPending }: Props) {
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
      const res = await fetch("/api/slack", { method: "POST", body: formData });
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
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleChange}
          className="hidden"
          id="slack-upload"
          disabled={loading}
        />
        <label
          htmlFor="slack-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {loading ? "Uploading…" : "Upload Slack Export"}
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {queued && (
        <p className="text-xs text-green-600">✓ &ldquo;{queued}&rdquo; queued for classification — will appear shortly</p>
      )}

    </div>
  );
}
