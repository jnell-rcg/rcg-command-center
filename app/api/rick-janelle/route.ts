import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "rick-janelle.json");

export async function GET() {
  if (!existsSync(FILE)) {
    return NextResponse.json({ meetings: [] });
  }
  try {
    const meetings = JSON.parse(readFileSync(FILE, "utf-8"));
    return NextResponse.json({ meetings });
  } catch {
    return NextResponse.json({ meetings: [] });
  }
}
