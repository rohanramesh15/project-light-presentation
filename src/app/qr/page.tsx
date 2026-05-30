"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

type Config = {
  qr_title: string;
  group_a_name: string;
  group_b_name: string;
};

export default function QrPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // window is only available client-side, so we read the origin in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <div className="relative z-10 shrink-0 bg-white">
        <header className="flex justify-center px-8 pt-12 pb-6">
          <h1 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
        {config?.qr_title ?? " "}
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

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="grid w-full max-w-4xl grid-cols-2 gap-10">
        <QrCard
          name={config?.group_a_name ?? "Group A"}
          url={origin ? `${origin}/submit/a` : ""}
          variant="a"
        />
        <QrCard
          name={config?.group_b_name ?? "Group B"}
          url={origin ? `${origin}/submit/b` : ""}
          variant="b"
        />
        </div>
      </div>
    </main>
  );
}

function QrCard({
  name,
  url,
  variant,
}: {
  name: string;
  url: string;
  variant: "a" | "b";
}) {
  const color = variant === "a" ? "var(--group-a)" : "var(--group-b)";
  return (
    <div className="flex flex-col items-center">
      <h2
        className="mb-5 font-display text-center text-2xl font-bold tracking-tight"
        style={{ color }}
      >
        {name}
      </h2>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {url ? (
          <QRCodeSVG value={url} size={240} fgColor="#1c1917" level="M" />
        ) : (
          <div className="h-[240px] w-[240px]" />
        )}
      </div>
      <p className="mt-4 break-all text-center text-xs text-muted">{url}</p>
    </div>
  );
}
