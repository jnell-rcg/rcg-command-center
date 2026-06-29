import { NextResponse } from "next/server";
import { clearAllCompleted } from "@/lib/fileQueue";

export async function POST() {
  const count = clearAllCompleted();
  return NextResponse.json({ cleared: count });
}
