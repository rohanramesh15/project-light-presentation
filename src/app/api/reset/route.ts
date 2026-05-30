import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await sql`DELETE FROM words`;
  return NextResponse.json({ ok: true });
}
