"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Config = {
  question: string;
  group_a_name: string;
  group_b_name: string;
};

export default function SubmitPage() {
  const params = useParams<{ group: string }>();
  const group = params.group;
  const valid = group === "a" || group === "b";

  const [config, setConfig] = useState<Config | null>(null);
  const [pending, setPending] = useState("");
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  if (!valid) {
    return (
      <main className="flex h-dvh items-center justify-center px-6 text-center">
        <p className="text-muted">Invalid group link.</p>
      </main>
    );
  }

  const accent =
    group === "a" ? "var(--group-a)" : "var(--group-b)";
  const groupName =
    group === "a" ? config?.group_a_name : config?.group_b_name;

  async function submit() {
    const word = pending.trim();
    if (!word) {
      setError("Enter a word first.");
      return;
    }

    setSending(true);
    setError("");
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, words: [word] }),
    });
    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }

    setJustSent(true);
    setPending("");
    setTimeout(() => setJustSent(false), 2500);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div
        className="mb-1 font-display text-sm font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {groupName ?? (group === "a" ? "Group A" : "Group B")}
      </div>
      <h1 className="font-display text-2xl font-semibold leading-snug tracking-tight">
        {config?.question ?? " "}
      </h1>
      <p className="mt-7 text-sm text-muted">
        Please add at least one word, but more are welcome!
      </p>
      <div className="mt-2">
        <input
          autoFocus
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a word…"
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:border-foreground/40"
        />
      </div>

      {error && <p className="mt-4 text-sm text-group-b">{error}</p>}

      <div className="mt-auto">
        <button
          onClick={submit}
          disabled={sending}
          style={{ backgroundColor: accent }}
          className="w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
        {justSent && (
          <p className="mt-3 text-center text-sm font-medium text-emerald-600">
            ✓ Sent! Add another if you like.
          </p>
        )}
      </div>
    </main>
  );
}
