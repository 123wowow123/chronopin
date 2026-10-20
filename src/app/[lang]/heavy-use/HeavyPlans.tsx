"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import { api } from "@/lib/client/api";
import { useT } from "@/lib/client/i18n";
import { useSession } from "@/lib/client/session";

type Plan = "month" | "subscription";

// The two ways to buy, and the state of a plan already bought. Signed-out
// visitors are sent to sign in first and come back here; paying and managing
// happen on Stripe's pages (the API answers with the address).
export function HeavyPlans({
  active,
  plan,
  endsOn,
  cancelling,
  paid,
  configured,
}: {
  active: boolean;
  plan: Plan | null;
  // The day the paid time ends, as YYYY-MM-DD.
  endsOn: string | null;
  cancelling: boolean;
  paid: boolean;
  configured: boolean;
}) {
  const t = useT();
  const { status, user } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const signedOut = status === "ready" && !user;

  async function go(path: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError("");
    try {
      const { url } = await api.post<{ url: string }>(path, body);
      window.location.assign(url);
    } catch {
      setError(t("heavy.checkoutError"));
      setBusy(null);
    }
  }

  const options: {
    plan: Plan;
    name: string;
    price: string;
    unit: string;
    points: string[];
    buy: string;
    featured?: boolean;
  }[] = [
    {
      plan: "month",
      name: t("heavy.monthName"),
      price: "$5",
      unit: t("heavy.monthUnit"),
      points: [t("heavy.monthP1"), t("heavy.monthP2"), t("heavy.monthP3")],
      buy: t("heavy.buyMonth"),
    },
    {
      plan: "subscription",
      name: t("heavy.subName"),
      price: "$4",
      unit: t("heavy.subUnit"),
      points: [t("heavy.subP1"), t("heavy.subP2"), t("heavy.subP3")],
      buy: t("heavy.buySub"),
      featured: true,
    },
  ];

  if (active) {
    return (
      <section
        className="surface mx-auto max-w-xl space-y-3 p-6 text-center"
        role="status"
      >
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {t("heavy.activeTitle")}
        </h2>
        <p className="text-muted">
          {endsOn
            ? t(
                cancelling || plan === "month"
                  ? "heavy.activeUntil"
                  : "heavy.activeRenews",
                { date: endsOn },
              )
            : t("heavy.activeOff")}
        </p>
        <p className="flex flex-wrap justify-center gap-3">
          {plan === "month" || cancelling ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null || !configured}
              onClick={() =>
                void go(
                  "/api/billing/heavy/checkout",
                  { plan: "month" },
                  "month",
                )
              }
            >
              {t("heavy.addMonth")}
            </button>
          ) : null}
          {plan === "subscription" ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={() => void go("/api/billing/heavy/portal", {}, "portal")}
            >
              {t("heavy.manage")}
            </button>
          ) : null}
          <Link href="/" className="btn btn-secondary">
            {t("heavy.backTimeline")}
          </Link>
        </p>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div>
      {paid ? (
        <p
          className="surface mx-auto mb-6 max-w-xl p-4 text-center text-success"
          role="status"
        >
          {t("heavy.paidThanks")}
        </p>
      ) : null}
      <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <li
            key={o.plan}
            className={`surface relative flex flex-col p-6 ${o.featured ? "ring-2 ring-accent" : ""}`}
          >
            {o.featured ? (
              <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                {t("heavy.bestValue")}
              </span>
            ) : null}
            <h3 className="font-semibold">{o.name}</h3>
            <p className="mt-2">
              <span className="font-display text-4xl font-semibold tabular-nums">
                {o.price}
              </span>{" "}
              <span className="text-subtle">{o.unit}</span>
            </p>
            <ul className="mt-4 mb-6 flex-1 space-y-1.5 text-sm text-muted">
              {o.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden className="text-accent">
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            {signedOut ? (
              <Link
                href="/login?redirect=%2Fheavy-use"
                prefetch={false}
                className={`btn ${o.featured ? "btn-primary" : "btn-secondary"}`}
              >
                {t("heavy.signIn")}
              </Link>
            ) : (
              <button
                type="button"
                className={`btn ${o.featured ? "btn-primary" : "btn-secondary"}`}
                disabled={busy !== null || !configured || status !== "ready"}
                onClick={() =>
                  void go(
                    "/api/billing/heavy/checkout",
                    { plan: o.plan },
                    o.plan,
                  )
                }
              >
                {busy === o.plan
                  ? t("heavy.opening")
                  : configured
                    ? o.buy
                    : t("heavy.comingSoon")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-4 text-center text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
