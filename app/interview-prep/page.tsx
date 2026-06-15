import type { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import InterviewPrepClient from "./InterviewPrepClient";

export const metadata: Metadata = {
  title: "Rick Interview Prep — RCG MEC Commentary Agent",
  description: "Contextualized questions for the next Rick voice session",
};

export default function InterviewPrepPage() {
  let content = "";
  let error = "";

  try {
    const filePath = join(
      process.env.USERPROFILE || "C:\\Users\\jridg",
      ".claude",
      "projects",
      "C--Users-jridg--claude",
      "memory",
      "rcg-rick-interview-prep.md"
    );
    content = readFileSync(filePath, "utf-8");
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return <InterviewPrepClient content={content} error={error} />;
}
