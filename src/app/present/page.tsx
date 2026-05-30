"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

// One quadrant of the hue wheel is 90°. Each word's color stays within half a
// quadrant (±45°) to the left and right of its group's base hue.
const QUADRANT = 90;
const HUE_SPREAD = QUADRANT * 0.5;

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "").trim();
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

// Deterministic offset in [-span, span) derived from the word text, so a given
// word always gets the same hue.
function hueOffset(text: string, span: number): number {
  let x = 0;
  for (let i = 0; i < text.length; i++) x = (x * 31 + text.charCodeAt(i)) >>> 0;
  return ((x % 1000) / 1000) * 2 * span - span;
}

// Minimum contrast every word color must keep against the page background.
const CONTRAST_TARGET = 4.5;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

// Luminance of the off-white app background (#fafaf9).
const BG_LUMINANCE = relLuminance([250, 250, 249]);

function contrastOnBg(rgb: [number, number, number]): number {
  const hi = Math.max(relLuminance(rgb), BG_LUMINANCE);
  const lo = Math.min(relLuminance(rgb), BG_LUMINANCE);
  return (hi + 0.05) / (lo + 0.05);
}

// Color for a word: base group hue shifted within ±0.5 quadrant. Lightness is
// solved per hue so every word lands as bright as possible while still meeting
// the contrast target — luminance varies a lot by hue, so a single fixed
// lightness would leave some hues too light to read.
function wordColor(base: { h: number; s: number }, text: string): string {
  const hue = (base.h + hueOffset(text, HUE_SPREAD) + 360) % 360;
  const s = Math.min(base.s, 0.85);
  let lo = 0.05;
  let hi = 0.6;
  let best = lo;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (contrastOnBg(hslToRgb(hue, s, mid)) >= CONTRAST_TARGET) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const [r, g, b] = hslToRgb(hue, s, best);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function PresentPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [groupA, setGroupA] = useState<Counts>({});
  const [groupB, setGroupB] = useState<Counts>({});
  const [connected, setConnected] = useState(false);
  // Group base colors, read from the CSS tokens so they stay in one place.
  const [accents, setAccents] = useState({ a: "#0d7e92", b: "#a46407" });

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig);

    const root = getComputedStyle(document.documentElement);
    const a = root.getPropertyValue("--group-a").trim();
    const b = root.getPropertyValue("--group-b").trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (a || b) setAccents({ a: a || "#0d7e92", b: b || "#a46407" });
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
    <main className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="absolute right-6 top-6 z-20 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-stone-300"
            }`}
          />
          {connected ? "Live" : "Connecting…"}
      </div>
      <div className="relative z-10 shrink-0 bg-white">
        <header className="flex justify-center px-8 pt-12 pb-6">
          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="px-6 text-center text-2xl font-medium tracking-tight md:text-3xl"
          >
          {config?.question ?? " "}
          </h1>
        </header>
        <svg
          className="absolute left-0 top-full w-full"
          style={{ height: "72px" }}
          viewBox="0 0 1440 72"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="#ffffff"
            d="M0,0 H1440 V34 C1320,70 1200,2 1080,34 C960,66 840,2 720,34 C600,66 480,2 360,34 C240,66 120,2 0,34 Z"
          />
        </svg>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <GroupColumn
          name={config?.group_a_name ?? "Group A"}
          counts={groupA}
          baseColor={accents.a}
          font="var(--font-display)"
        />
        <GroupColumn
          name={config?.group_b_name ?? "Group B"}
          counts={groupB}
          baseColor={accents.b}
          font="var(--font-display)"
        />
      </div>
    </main>
  );
}

function GroupColumn({
  name,
  counts,
  baseColor,
  font,
}: {
  name: string;
  counts: Counts;
  baseColor: string;
  font: string;
}) {
  const words = useMemo(
    () => Object.values(counts).sort((x, y) => y.count - x.count),
    [counts],
  );
  const base = useMemo(() => hexToHsl(baseColor), [baseColor]);

  return (
    <section className="flex min-h-0 flex-col bg-background">
      <div className="shrink-0 px-8 pt-24 pb-4 text-center">
        <h2
          className="inline-block rounded-full px-5 py-1.5 text-2xl font-medium tracking-tight text-white"
          style={{ backgroundColor: baseColor, fontFamily: font }}
        >
          {name}
        </h2>
      </div>

      <WordCloud words={words} base={base} font={font} />
    </section>
  );
}

type Placed = {
  text: string;
  fontSize: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

// Font size in px scaled by how many times a word was submitted.
function sizeFor(count: number): number {
  return 26 + Math.min(count, 12) * 9;
}

function rectsOverlap(
  x: number,
  y: number,
  w: number,
  h: number,
  p: Placed,
): boolean {
  const padX = 16;
  const padY = 12;
  return (
    Math.abs(x - p.x) * 2 < w + p.w + padX &&
    Math.abs(y - p.y) * 2 < h + p.h + padY
  );
}

// Pack words into a cohesive centered cluster using an Archimedean spiral:
// biggest word lands at the center, the rest spiral outward into the first
// non-overlapping slot. Deterministic, so the layout is stable frame to frame
// and words only shift when the set actually changes.
function packCloud(words: { text: string; count: number }[]): Placed[] {
  const sorted = [...words].sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text),
  );
  const placed: Placed[] = [];
  for (const word of sorted) {
    const fontSize = sizeFor(word.count);
    const w = Math.max(word.text.length * fontSize * 0.56, fontSize * 0.6);
    const h = fontSize;
    let pos = { x: 0, y: 0 };
    for (let t = 0; t < 80; t += 0.15) {
      const r = 9 * t;
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r * 0.62; // squash vertically → landscape cloud
      if (placed.every((p) => !rectsOverlap(x, y, w, h, p))) {
        pos = { x, y };
        break;
      }
    }
    placed.push({ text: word.text, fontSize, x: pos.x, y: pos.y, w, h });
  }
  return placed;
}

function WordCloud({
  words,
  base,
  font,
}: {
  words: { text: string; count: number }[];
  base: { h: number; s: number; l: number };
  font: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placed = useMemo(() => packCloud(words), [words]);

  // Scale the whole cluster so it always fits the column with a little margin.
  const scale = useMemo(() => {
    if (!placed.length || !size.w || !size.h) return 1;
    const maxX = Math.max(...placed.map((p) => Math.abs(p.x) + p.w / 2));
    const maxY = Math.max(...placed.map((p) => Math.abs(p.y) + p.h / 2));
    return Math.min(1.7, (size.w * 0.36) / maxX, (size.h * 0.36) / maxY);
  }, [placed, size]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden"
    >
      {placed.length === 0 ? (
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-muted">
          Waiting for words…
        </p>
      ) : (
        <div
          className="absolute left-1/2 top-[41%]"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
            transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {placed.map((p) => (
            <div
              key={p.text.toLowerCase()}
              className="absolute left-0 top-0"
              style={{
                transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`,
                transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <span
                className="word-pop block whitespace-nowrap font-semibold leading-none"
                style={{
                  color: wordColor(base, p.text.toLowerCase()),
                  fontFamily: font,
                  fontSize: `${p.fontSize}px`,
                  transition: "font-size 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {p.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
