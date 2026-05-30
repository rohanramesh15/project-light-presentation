import { sql, type Word } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// EventSource auto-reconnects when the function recycles; we resume via the
// Last-Event-ID header, so a short cap is fine on serverless.
export const maxDuration = 60;

const POLL_MS = 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lastEventId = req.headers.get("last-event-id") ?? url.searchParams.get("since");
  let cursor = Number(lastEventId) || 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", close);

      const send = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          close();
        }
      };

      // Open the stream and tell the client we're connected.
      send(`retry: 2000\nevent: ready\ndata: {}\n\n`);

      const tick = async () => {
        if (closed) return;
        try {
          // Detect a reset: if the table's max id dropped below our cursor,
          // words were cleared — tell the client to wipe its board.
          const maxRows = (await sql`
            SELECT COALESCE(MAX(id), 0) AS maxid FROM words
          `) as { maxid: number }[];
          const maxId = Number(maxRows[0]?.maxid ?? 0);
          if (maxId < cursor) {
            cursor = 0;
            send(`event: reset\ndata: {}\n\n`);
          }

          const rows = (await sql`
            SELECT id, group_key, text FROM words
            WHERE id > ${cursor}
            ORDER BY id ASC
            LIMIT 500
          `) as Word[];

          for (const w of rows) {
            cursor = w.id;
            send(`id: ${w.id}\nevent: word\ndata: ${JSON.stringify(w)}\n\n`);
          }

          // Heartbeat keeps proxies from closing an idle connection.
          send(`: ping\n\n`);
        } catch {
          // Transient DB error — keep the connection and retry next tick.
        }
      };

      const timer = setInterval(tick, POLL_MS);
      await tick();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
