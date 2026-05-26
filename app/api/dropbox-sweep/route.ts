import { NextResponse } from "next/server";
import { writePending } from "@/lib/fileQueue";
import { randomUUID } from "crypto";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname, relative } from "path";

const DROPBOX_ROOT = "C:\\Users\\jridg\\3 Dropbox\\Robyn Consulting";

// Folders to scan (relative to root)
const SCAN_FOLDERS = [
  "C. Client Operations\\01. Active",
  "C. Client Operations\\04. OS Sprint",
  "D. Departments\\00. Strategy",
  "D. Departments\\06. Product Ops",
  "Z. AI Projects",
];

const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".md"];
const DAYS_BACK = 14;

interface FileEntry {
  path: string;
  label: string;
  content: string;
}

function getRecentFiles(folder: string, cutoff: Date): FileEntry[] {
  const results: FileEntry[] = [];

  function walk(dir: string) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      const full = join(dir, entry);
      let stat;
      try { stat = statSync(full); } catch { continue; }

      if (stat.isDirectory()) {
        walk(full);
      } else if (SUPPORTED_EXTENSIONS.includes(extname(entry).toLowerCase())) {
        if (stat.mtime >= cutoff) {
          try {
            let content = "";
            if (extname(entry).toLowerCase() === ".pdf") {
              // PDF parsing handled async — skip here, handle below
              content = "__PDF__:" + full;
            } else {
              content = readFileSync(full, "utf-8");
            }
            results.push({
              path: full,
              label: relative(DROPBOX_ROOT, full),
              content,
            });
          } catch { continue; }
        }
      }
    }
  }

  walk(folder);
  return results;
}

export async function POST() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAYS_BACK);

    const allFiles: FileEntry[] = [];

    for (const rel of SCAN_FOLDERS) {
      const full = join(DROPBOX_ROOT, rel);
      allFiles.push(...getRecentFiles(full, cutoff));
    }

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: `No files modified in the last ${DAYS_BACK} days in scanned folders` },
        { status: 404 }
      );
    }

    // Resolve PDFs async
    const resolved: { label: string; content: string }[] = [];
    for (const f of allFiles) {
      if (f.content.startsWith("__PDF__:")) {
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const buf = readFileSync(f.content.replace("__PDF__:", ""));
          const parsed = await pdfParse(buf);
          resolved.push({ label: f.label, content: parsed.text });
        } catch { continue; }
      } else {
        resolved.push({ label: f.label, content: f.content });
      }
    }

    const text = resolved
      .map((f) => `=== ${f.label} ===\n${f.content.trim()}`)
      .join("\n\n");

    const id = randomUUID();
    writePending({ id, source: "Dropbox", text });

    return NextResponse.json({ id, status: "pending", filesScanned: resolved.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
