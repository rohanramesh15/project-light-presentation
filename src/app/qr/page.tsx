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
    <main className="flex h-dvh flex-col items-center justify-center px-8">
      <h1 className="mb-12 text-center text-3xl font-semibold tracking-tight md:text-4xl">
        {config?.qr_title ?? " "}
      </h1>

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
        className="mb-5 text-center text-2xl font-bold tracking-tight"
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
