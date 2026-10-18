"use client";

import { useEffect, useRef, useState } from "react";
import { CardGrid } from "@/components/pin/CardGrid";
import { PinCard } from "@/components/pin/PinCard";
import { TimelineVideoProvider } from "@/lib/client/timelineVideo";
import type { TimelineVideoSetting } from "@/lib/timelineVideo";
import { pinTense } from "@/lib/timeline";
import type { PinJson } from "@/lib/types";

type Card = Parameters<typeof PinCard>[0]["pin"];

const GRID =
  "grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]! max-sm:grid-cols-1!";

// A card-shaped placeholder: a picture, a title and two lines of detail.
function CardSkeleton({ delay }: { delay: number }) {
  return (
    <li
      className="animate-pulse overflow-hidden rounded-xl border border-line bg-panel"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="aspect-video bg-raised" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-4/5 rounded bg-raised" />
        <div className="h-3 w-full rounded bg-raised" />
        <div className="h-3 w-2/3 rounded bg-raised" />
      </div>
    </li>
  );
}

// "More like this", fetched only once the reader scrolls near it, so the pin's
// page does not wait on (or pay for) pins nobody reaches. Nothing shows when
// there are none.
export function RelatedPins({
  pinId,
  locale,
  heading,
  loadingLabel,
  serverTimeZone,
  todayKey,
  video,
}: {
  pinId: number;
  locale: string;
  heading: string;
  loadingLabel: string;
  serverTimeZone: string;
  todayKey: string;
  video: TimelineVideoSetting;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [pins, setPins] = useState<Card[]>([]);

  useEffect(() => {
    const node = anchor.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          setState("loading");
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (state !== "loading") return;
    const controller = new AbortController();
    fetch(`/api/pins/${pinId}/related?lang=${encodeURIComponent(locale)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<Card[]>) : []))
      .then((found) => {
        setPins(found);
        setState("done");
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setState("done");
      });
    return () => controller.abort();
  }, [state, pinId, locale]);

  if (state === "done" && !pins.length) return null;
  const now = new Date();

  return (
    <section
      ref={anchor}
      aria-labelledby="related-heading"
      aria-busy={state !== "done"}
      className="mt-16 min-h-40 border-t border-line pt-10"
    >
      {state === "idle" ? null : (
        <>
          <h2
            id="related-heading"
            className="mb-4 text-xl font-semibold tracking-tight"
          >
            {heading}
          </h2>
          {state === "loading" ? (
            <>
              <span role="status" className="sr-only">
                {loadingLabel}
              </span>
              <ul className={`grid list-none gap-6 p-0 ${GRID}`} aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <CardSkeleton key={i} delay={i * 120} />
                ))}
              </ul>
            </>
          ) : (
            <TimelineVideoProvider setting={video}>
              <CardGrid className={GRID}>
                {pins.map((p) => (
                  <li key={p.id}>
                    <PinCard
                      pin={p}
                      serverTimeZone={serverTimeZone}
                      tense={pinTense(p as unknown as PinJson, now, todayKey)}
                      todayKey={todayKey}
                    />
                  </li>
                ))}
              </CardGrid>
            </TimelineVideoProvider>
          )}
        </>
      )}
    </section>
  );
}
