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
  const [words, setWords] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(0);
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

  function addPending() {
    const w = pending.trim();
    if (!w) return;
    setWords((list) => [...list, w]);
    setPending("");
    setError("");
  }

  function removeWord(i: number) {
    setWords((list) => list.filter((_, idx) => idx !== i));
  }

  async function submit() {
    const all = [...words];
    const trailing = pending.trim();
    if (trailing) all.push(trailing);

    if (all.length === 0) {
      setError("Enter at least one word.");
      return;
    }

    setSending(true);
    setError("");
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, words: all }),
    });
    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }

    setJustSent(all.length);
    setWords([]);
    setPending("");
    setTimeout(() => setJustSent(0), 2500);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div
        className="mb-1 text-sm font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {groupName ?? (group === "a" ? "Group A" : "Group B")}
      </div>
      <h1 className="text-2xl font-semibold leading-snug tracking-tight">
        {config?.question ?? " "}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Add as many words as you like. At least one to submit.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          autoFocus
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPending();
            }
          }}
          placeholder="Type a word…"
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:border-foreground/40"
        />
        <button
          onClick={addPending}
          className="shrink-0 rounded-lg border border-border px-4 text-sm font-medium text-muted transition hover:border-foreground/40 hover:text-foreground"
        >
          Add
        </button>
      </div>

      {words.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {words.map((w, i) => (
            <li key={`${w}-${i}`}>
              <button
                onClick={() => removeWord(i)}
                className="group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
                style={{ borderColor: accent, color: accent }}
                title="Tap to remove"
              >
                {w}
                <span className="text-xs opacity-50 group-hover:opacity-100">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 text-sm text-group-b">{error}</p>}

      <div className="mt-auto pt-8">
        <button
          onClick={submit}
          disabled={sending}
          className="w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {sending ? "Submitting…" : "Submit"}
        </button>
        {justSent > 0 && (
          <p className="mt-3 text-center text-sm font-medium text-emerald-600">
            ✓ Sent {justSent} {justSent === 1 ? "word" : "words"}. Add more if you like!
          </p>
        )}
      </div>
    </main>
  );
}
