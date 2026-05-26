"use client";

import { useEffect, useState } from "react";

interface ActionItem {
  text: string;
  owner: string;
}

interface Meeting {
  id: number;
  title: string;
  date: string;
  url: string;
  summary: string;
  actionItems: ActionItem[];
}

const HIDDEN_KEY = "rcg-hidden-1on1s";

function getHidden(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveHidden(ids: Set<number>) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function RickJanelle1on1() {
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    setHidden(getHidden());
    fetch("/api/rick-janelle")
      .then((r) => r.json())
      .then((d) => setAllMeetings(d.meetings ?? []));
  }, []);

  function toggleMeeting(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function hideMeeting(id: number) {
    const next = new Set(hidden);
    next.add(id);
    saveHidden(next);
    setHidden(next);
    setConfirmDelete(null);
  }

  function restoreAll() {
    saveHidden(new Set());
    setHidden(new Set());
  }

  const meetings = allMeetings.filter((m) => !hidden.has(m.id));

  if (allMeetings.length === 0) return null;

  const mostRecent = meetings[0] ?? allMeetings[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ backgroundColor: "#0d2b2a" }}
      >
        <div className="flex items-center gap-2.5">
          {/* Two avatar circles */}
          <div className="flex -space-x-1.5">
            <div className="h-6 w-6 rounded-full bg-orange-500 border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white">J</div>
            <div className="h-6 w-6 rounded-full bg-teal-600 border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white">R</div>
          </div>
          <span className="text-sm font-bold text-white">Rick & Janelle — 1:1s</span>
          <span className="text-[10px] text-white/40 font-medium">Gym Meetings · Game Plans</span>
        </div>
        <div className="flex items-center gap-3">
          {hidden.size > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); restoreAll(); }}
              className="text-[10px] text-white/40 hover:text-white/70 underline transition"
            >
              restore {hidden.size} hidden
            </button>
          )}
          <span className="text-[10px] text-white/40">
            {mostRecent && `Last: ${new Date(mostRecent.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </span>
          <svg
            className={`h-4 w-4 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="divide-y divide-slate-100">
          {meetings.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">
              All meetings hidden.{" "}
              <button onClick={restoreAll} className="text-teal-700 underline hover:text-teal-900">
                Restore all
              </button>
            </p>
          )}
          {meetings.map((meeting) => (
            <div key={meeting.id} className="px-4 py-3 group/meeting">
              {/* Meeting header row */}
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => toggleMeeting(meeting.id)}
                  className="flex-1 flex items-start gap-3 text-left min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{meeting.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{meeting.summary}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <a
                      href={meeting.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-medium hover:underline"
                      style={{ color: "#0d2b2a" }}
                    >
                      View ↗
                    </a>
                    <svg
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expanded.has(meeting.id) ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Delete button */}
                <div className="flex-shrink-0 mt-0.5">
                  {confirmDelete === meeting.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Remove?</span>
                      <button
                        onClick={() => hideMeeting(meeting.id)}
                        className="text-[10px] font-semibold text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(meeting.id)}
                      aria-label="Hide meeting"
                      className="opacity-0 group-hover/meeting:opacity-100 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-400 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Action items */}
              {expanded.has(meeting.id) && meeting.actionItems.length > 0 && (
                <div className="mt-3 space-y-1.5 pl-2 border-l-2 border-orange-200">
                  {meeting.actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="text-xs text-slate-700 flex-1">{item.text}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        item.owner === "Janelle"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-teal-50 text-teal-700"
                      }`}>
                        {item.owner}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
