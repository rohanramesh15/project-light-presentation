"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Config = {
  question: string;
  qr_title: string;
  group_a_name: string;
  group_b_name: string;
};

export default function Dashboard() {
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [resetStatus, setResetStatus] = useState<"idle" | "clearing" | "cleared">("idle");

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
    if (
      !confirm(
        "Clear every word sent by everyone and wipe the live screen? This cannot be undone.",
      )
    )
      return;
    setResetStatus("clearing");
    await fetch("/api/reset", { method: "POST" });
    setResetStatus("cleared");
    setTimeout(() => setResetStatus("idle"), 2000);
  }

  function update(key: keyof Config, value: string) {
    if (config) setConfig({ ...config, [key]: value });
  }

  const groupA = config?.group_a_name ?? "Group A";
  const groupB = config?.group_b_name ?? "Group B";

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Project Light Presentation
        </h1>
        <p className="mt-1 text-sm text-muted">
          Set up your question and groups, then open the screens for class.
        </p>
      </header>

      {/* ── Open for class ───────────────────────────── */}
      <SectionHeading>Open for class</SectionHeading>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <LinkCard
          href="/present"
          title="Presentation screen"
          desc="Live words, split by group."
        />
        <LinkCard
          href="/qr"
          title="QR code screen"
          desc="Students scan to join."
        />
      </div>
      <div className="mb-10 grid grid-cols-2 gap-3">
        <LinkCard
          href="/submit/a"
          title={`${groupA} form`}
          desc="Add words for the left side."
          tone="a"
        />
        <LinkCard
          href="/submit/b"
          title={`${groupB} form`}
          desc="Add words for the right side."
          tone="b"
        />
      </div>

      {/* ── Settings ─────────────────────────────────── */}
      <SectionHeading>Settings</SectionHeading>
      {!config ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <div className="space-y-6 rounded-xl border border-border bg-card p-6">
            <Field
              label="Question"
              hint="Shown on the forms and the presentation screen."
              value={config.question}
              onChange={(v) => update("question", v)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Group A name"
                hint="Left side of the board."
                value={config.group_a_name}
                onChange={(v) => update("group_a_name", v)}
                accent="a"
              />
              <Field
                label="Group B name"
                hint="Right side of the board."
                value={config.group_b_name}
                onChange={(v) => update("group_b_name", v)}
                accent="b"
              />
            </div>

            <Field
              label="QR screen title"
              hint="Heading above the two QR codes."
              value={config.qr_title}
              onChange={(v) => update("qr_title", v)}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
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
              disabled={resetStatus === "clearing"}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-group-b hover:text-group-b disabled:opacity-50"
            >
              {resetStatus === "clearing"
                ? "Clearing…"
                : resetStatus === "cleared"
                  ? "Cleared ✓"
                  : "Reset words"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Reset clears every word from both groups and wipes the live screen instantly.
          </p>
        </>
      )}
    </main>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </h2>
  );
}

function LinkCard({
  href,
  title,
  desc,
  tone,
}: {
  href: string;
  title: string;
  desc: string;
  tone?: "a" | "b";
}) {
  const toneClass =
    tone === "a"
      ? "bg-group-a-soft hover:border-group-a"
      : tone === "b"
        ? "bg-group-b-soft hover:border-group-b"
        : "bg-card hover:border-foreground/30";
  const titleClass =
    tone === "a" ? "text-group-a" : tone === "b" ? "text-group-b" : "";
  return (
    <Link
      href={href}
      target="_blank"
      className={`rounded-xl border border-border px-4 py-5 transition hover:shadow-sm ${toneClass}`}
    >
      <div className={`text-base font-medium ${titleClass}`}>{title} →</div>
      <div className="mt-1 text-sm text-muted">{desc}</div>
    </Link>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  accent,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  accent?: "a" | "b";
}) {
  const dotClass =
    accent === "a" ? "bg-group-a" : accent === "b" ? "bg-group-b" : "";
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {accent && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </span>
      <input
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="mt-1 block text-xs text-muted">{hint}</span>
    </label>
  );
}
