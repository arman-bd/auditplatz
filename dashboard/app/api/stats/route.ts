import { NextResponse } from "next/server";
import { getDBStats, getLocationBreakdown, hasData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const exists = await hasData();
  if (!exists) return NextResponse.json({ hasData: false });

  const [stats, locations] = await Promise.all([
    getDBStats(),
    getLocationBreakdown(),
  ]);

  return NextResponse.json({ hasData: true, stats, locations });
}
