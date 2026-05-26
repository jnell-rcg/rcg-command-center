import { NextResponse } from "next/server";
import { spawnSync } from "child_process";

export async function GET() {
  const claudeBin = "C:\\Users\\jridg\\.local\\bin\\claude.exe";

  const result = spawnSync(claudeBin, ["--print"], {
    input: "Return only this exact text, nothing else: []",
    encoding: "utf8",
    timeout: 30_000,
    shell: false,
  });

  return NextResponse.json({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error?.message ?? null,
  });
}
