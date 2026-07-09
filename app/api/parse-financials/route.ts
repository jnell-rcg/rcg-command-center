import { NextRequest, NextResponse } from "next/server";
import { parseMBR } from "@/lib/parseMBR";
import { parseCSVText, parseCommentaryDataRows, parseActVBudRows } from "@/lib/parseCSV";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();

    // ── CSV files ────────────────────────────────────────────────────────────
    if (filename.endsWith(".csv")) {
      const text = await file.text();
      const data = parseCSVText(text, file.name);
      return NextResponse.json({ data, sheetNames: ["CSV"], parsedTab: "CSV", parseDebug: [] });
    }

    // ── Excel files — check for Commentary_Data or Act. v Bud tabs first ────
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });

    // Priority 1: Commentary_Data tab (pre-structured for the agent — most reliable)
    const commentaryTabName = wb.SheetNames.find(n =>
      n.toLowerCase().replace(/[^a-z0-9]/g, "") === "commentarydata" ||
      n.toLowerCase().replace(/[^a-z0-9]/g, "").includes("commentary")
    );
    if (commentaryTabName) {
      const sheet = wb.Sheets[commentaryTabName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][];
      const data = parseCommentaryDataRows(rows);
      return NextResponse.json({
        data,
        sheetNames: wb.SheetNames,
        parsedTab: commentaryTabName,
        parseDebug: [`Commentary_Data tab found: "${commentaryTabName}"`],
      });
    }

    // Priority 2: Act. v Bud tab
    const actVBudTabName = wb.SheetNames.find(n => {
      const norm = n.toLowerCase().replace(/[^a-z0-9]/g, "");
      return norm.includes("actvbud") || norm.includes("actualsvsb") || norm.includes("budgetvsactual");
    });
    if (actVBudTabName) {
      const sheet = wb.Sheets[actVBudTabName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][];
      const data = parseActVBudRows(rows);
      return NextResponse.json({
        data,
        sheetNames: wb.SheetNames,
        parsedTab: actVBudTabName,
        parseDebug: [`Act. v Bud tab found: "${actVBudTabName}"`],
      });
    }

    // Priority 3: Existing MBR / IS / P&L parser
    const { data, sheetNames, parsedTab, parseDebug } = parseMBR(buffer);
    return NextResponse.json({ data, sheetNames, parsedTab, parseDebug });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
