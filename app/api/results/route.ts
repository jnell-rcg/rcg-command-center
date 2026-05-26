import { NextResponse } from "next/server";
import { readAllResults } from "@/lib/fileQueue";

export async function GET() {
  const items = readAllResults();
  return NextResponse.json({ items });
}
