import { NextResponse } from "next/server";
import { getConfig, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getConfig();
  return NextResponse.json(config);
}

const MAX_LEN = 200;

function clean(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, MAX_LEN);
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function PUT(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await getConfig();
  const question = clean(body.question, current.question);
  const qr_title = clean(body.qr_title, current.qr_title);
  const group_a_name = clean(body.group_a_name, current.group_a_name);
  const group_b_name = clean(body.group_b_name, current.group_b_name);

  await sql`
    UPDATE config
    SET question = ${question},
        qr_title = ${qr_title},
        group_a_name = ${group_a_name},
        group_b_name = ${group_b_name}
    WHERE id = 1
  `;

  return NextResponse.json({ question, qr_title, group_a_name, group_b_name });
}
