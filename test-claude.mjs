import { spawnSync } from "child_process";

const claudeBin = "C:\\Users\\jridg\\.local\\bin\\claude.exe";

console.log("Testing claude spawn...");
const result = spawnSync(claudeBin, ["--print"], {
  input: "Return only this exact JSON, nothing else: []",
  encoding: "utf8",
  timeout: 30_000,
  shell: false,
});

console.log("status:", result.status);
console.log("error:", result.error);
console.log("stdout:", JSON.stringify(result.stdout));
console.log("stderr:", JSON.stringify(result.stderr));
