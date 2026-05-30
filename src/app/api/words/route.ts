import { NextResponse } from "next/server";
import { sql, isGroupKey, type Word } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WORD_LEN = 50;
const MAX_WORDS_PER_SUBMIT = 50;

export async function GET(req: Request) {
  const group = new URL(req.url).searchParams.get("group");
  const rows = isGroupKey(group)
    ? ((await sql`
        SELECT id, group_key, text FROM words
        WHERE group_key = ${group} ORDER BY id ASC
      `) as Word[])
    : ((await sql`
        SELECT id, group_key, text FROM words ORDER BY id ASC
      `) as Word[]);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  let body: { group?: unknown; words?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { group, words } = body;
  if (!isGroupKey(group)) {
    return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  }
  if (!Array.isArray(words)) {
    return NextResponse.json({ error: "words must be an array" }, { status: 400 });
  }

  const cleaned = words
    .filter((w): w is string => typeof w === "string")
    .map((w) => w.trim().replace(/\s+/g, " ").slice(0, MAX_WORD_LEN))
    .filter((w) => w.length > 0)
    .slice(0, MAX_WORDS_PER_SUBMIT);

  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: "Enter at least one word" },
      { status: 400 },
    );
  }

  // Bulk insert via unnest so it's a single statement.
  const groups = cleaned.map(() => group);
  await sql`
    INSERT INTO words (group_key, text)
    SELECT * FROM unnest(${groups}::text[], ${cleaned}::text[])
  `;

  return NextResponse.json({ inserted: cleaned.length });
}
