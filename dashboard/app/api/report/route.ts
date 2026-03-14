import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { join } from "path";

export async function POST() {
  try {
    const log = execSync("npx tsx src/run-audit.ts report", {
      cwd: join(process.cwd(), ".."),
      timeout: 300000,
      encoding: "utf-8",
    });
    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.stderr || err.message }, { status: 500 });
  }
}
