import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local");
}

// Tagged-template SQL client backed by Neon's HTTP driver (works on serverless).
export const sql = neon(process.env.DATABASE_URL);

export type GroupKey = "a" | "b";

export type Config = {
  question: string;
  qr_title: string;
  group_a_name: string;
  group_b_name: string;
};

export type Word = {
  id: number;
  group_key: GroupKey;
  text: string;
};

export function isGroupKey(value: unknown): value is GroupKey {
  return value === "a" || value === "b";
}

export async function getConfig(): Promise<Config> {
  const rows = (await sql`
    SELECT question, qr_title, group_a_name, group_b_name
    FROM config WHERE id = 1
  `) as Config[];
  return rows[0];
}
