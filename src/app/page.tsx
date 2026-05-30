"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Config = {
  question: string;
  qr_title: string;
  group_a_name: string;
  group_b_name: string;
};

const FIELDS: { key: keyof Config; label: string; hint: string }[] = [
  { key: "question", label: "Question", hint: "Shown on the forms and the presentation screen." },
  { key: "qr_title", label: "QR screen title", hint: "Heading above the two QR codes." },
  { key: "group_a_name", label: "Group A name", hint: "Left side of the board." },
  { key: "group_b_name", label: "Group B name", hint: "Right side of the board." },
];

export default function Dashboard() {
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  async function save() {
    if (!config) return;
    setStatus("saving");
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  async function reset() {
    if (!confirm("Clear all submitted words? This cannot be undone.")) return;
    await fetch("/api/reset", { method: "POST" });
    alert("Board cleared.");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Live Word Board</h1>
        <p className="mt-1 text-sm text-muted">
          Set up your question and groups, then open the screens for class.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 mb-10">
        <Link
          href="/present"
          target="_blank"
          className="rounded-xl border border-border bg-card px-4 py-5 transition hover:border-foreground/30 hover:shadow-sm"
        >
          <div className="text-base font-medium">Presentation screen →</div>
          <div className="mt-1 text-sm text-muted">Live words, split by group.</div>
        </Link>
        <Link
          href="/qr"
          target="_blank"
          className="rounded-xl border border-border bg-card px-4 py-5 transition hover:border-foreground/30 hover:shadow-sm"
        >
          <div className="text-base font-medium">QR code screen →</div>
          <div className="mt-1 text-sm text-muted">Students scan to join.</div>
        </Link>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
          Settings
        </h2>

        {!config ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="space-y-5">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-sm font-medium">{f.label}</span>
                <input
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  value={config[f.key]}
                  onChange={(e) =>
                    setConfig({ ...config, [f.key]: e.target.value })
                  }
                />
                <span className="mt-1 block text-xs text-muted">{f.hint}</span>
              </label>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={save}
                disabled={status === "saving"}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {status === "saving"
                  ? "Saving…"
                  : status === "saved"
                    ? "Saved ✓"
                    : "Save changes"}
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-group-b hover:text-group-b"
              >
                Reset words
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
