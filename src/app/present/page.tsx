"use client";

import { useEffect, useMemo, useState } from "react";

type Config = {
  question: string;
  group_a_name: string;
  group_b_name: string;
};

type WordEvent = { id: number; group_key: "a" | "b"; text: string };
type Counts = Record<string, { text: string; count: number }>;

function addWord(counts: Counts, text: string): Counts {
  const key = text.toLowerCase();
  const existing = counts[key];
  return {
    ...counts,
    [key]: { text: existing?.text ?? text, count: (existing?.count ?? 0) + 1 },
  };
}

export default function PresentPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [groupA, setGroupA] = useState<Counts>({});
  const [groupB, setGroupB] = useState<Counts>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("error", () => setConnected(false));

    es.addEventListener("reset", () => {
      setGroupA({});
      setGroupB({});
    });

    es.addEventListener("word", (e) => {
      const w: WordEvent = JSON.parse((e as MessageEvent).data);
      if (w.group_key === "a") setGroupA((c) => addWord(c, w.text));
      else setGroupB((c) => addWord(c, w.text));
    });

    return () => es.close();
  }, []);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-white text-foreground">
      <header className="shrink-0 px-8 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-muted">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-stone-300"
            }`}
          />
          {connected ? "Live" : "Connecting…"}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {config?.question ?? " "}
        </h1>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <GroupColumn
          name={config?.group_a_name ?? "Group A"}
          counts={groupA}
          variant="a"
        />
        <GroupColumn
          name={config?.group_b_name ?? "Group B"}
          counts={groupB}
          variant="b"
        />
      </div>
    </main>
  );
}

function GroupColumn({
  name,
  counts,
  variant,
}: {
  name: string;
  counts: Counts;
  variant: "a" | "b";
}) {
  const words = useMemo(
    () => Object.values(counts).sort((x, y) => y.count - x.count),
    [counts],
  );
  const total = words.reduce((s, w) => s + w.count, 0);

  const divider = variant === "a" ? "border-r border-border" : "";

  return (
    <section className={`flex min-h-0 flex-col bg-white ${divider}`}>
      <div className="shrink-0 px-6 py-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {name}
        </h2>
        <p className="text-xs text-muted">{total} words</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-x-6 gap-y-2 overflow-y-auto px-6 pb-8">
        {words.length === 0 ? (
          <p className="text-sm text-muted">Waiting for words…</p>
        ) : (
          words.map((w) => (
            <span
              key={w.text.toLowerCase()}
              className="word-pop font-semibold leading-tight text-foreground transition-all duration-300"
              style={{
                fontSize: `${1.4 + Math.min(w.count, 8) * 0.5}rem`,
                opacity: 0.55 + Math.min(w.count, 6) * 0.075,
              }}
            >
              {w.text}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
