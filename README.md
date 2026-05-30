# Live Word Board

A Mentimeter-style live word board for class presentations. Two groups of students
submit words describing an experience; the words appear live on a projected screen,
split into one half per group. You share the forms via on-screen QR codes.

Built with Next.js (App Router) + Neon Postgres. Live updates use Server-Sent
Events (SSE), which work reliably on Vercel's serverless platform (native
WebSockets do not).

## Pages

| Route            | Purpose                                                             |
| ---------------- | ------------------------------------------------------------------- |
| `/`              | **Dashboard** — edit the question, QR title, group names; reset.    |
| `/present`       | **Presentation screen** — live words, split left/right by group.    |
| `/qr`            | **QR screen** — two QR codes (one per group form), labeled by name. |
| `/submit/a`, `/submit/b` | **Student forms** — add as many words as you like (≥ 1).    |

Open `/present` and `/qr` on the projector. Students scan the QR codes to reach
their group's form. The QR codes encode `<current-origin>/submit/a` and
`/submit/b`, so the same screen works locally and once deployed — no edits needed.

## Local development

1. Install deps: `npm install`
2. Set `DATABASE_URL` in `.env.local` (a Neon Postgres connection string). One is
   already configured for this project.
3. Run: `npm run dev` → open the printed URL (e.g. http://localhost:3000).

## Database

Neon Postgres, two tables (already created):

- `config` — a single row (`id = 1`) holding the question, QR title, and the two
  group names.
- `words` — one row per submitted word (`group_key` is `'a'` or `'b'`).

The dashboard "Reset words" button clears the `words` table.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project** and select the repo (framework auto-detected).
3. Add an environment variable `DATABASE_URL` with the Neon connection string
   (the same value as in `.env.local`).
4. Deploy. Open `<your-domain>/qr` on the projector — the QR codes now point at the
   deployed domain automatically, so students can scan from any network.

## How live updates work

`/present` opens one `EventSource` to `/api/stream`. The server tails the `words`
table (~1s) and pushes each new word as an SSE event tagged with its row id. If the
serverless function recycles, the browser reconnects automatically and resumes from
the last id via the `Last-Event-ID` header, so no words are missed. Clearing words
from the dashboard sends a `reset` event that wipes the board.
