import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const filePath = join(
      process.env.USERPROFILE || "C:\\Users\\jridg",
      ".claude",
      "projects",
      "C--Users-jridg--claude",
      "memory",
      "rcg-rick-interview-prep.md"
    );
    const content = readFileSync(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
