"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Zap,
  Check,
  ShoppingBag,
  ArrowLeft,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { calculateProfileDepth } from "@/lib/ai/profile-depth";
import type { GeneratedProtocol, UserProfile } from "@/lib/ai/types";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";

/* ── Loading skeleton ──────────────────────────────────────── */
function ProtocolSkeleton() {
  return (
    <div className="px-4 pt-4 animate-pulse">
      <div className="h-4 w-20 rounded-full bg-surface-container-high mb-4" />
      <div className="feed-card-ai p-5 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container/10 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 w-24 rounded bg-primary-container/20" />
            <div className="h-6 w-40 rounded bg-surface-container-high" />
            <div className="h-3 w-full rounded bg-surface-container-high" />
            <div className="h-3 w-5/6 rounded bg-surface-container-high" />
          </div>
        </div>
      </div>
      <div className="feed-card p-5 mb-3">
        <div className="h-3 w-32 rounded bg-surface-container-high mb-3" />
        <div className="h-5 w-4/5 rounded bg-surface-container-high mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-surface-container-low" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Protocol title + concern helpers ─────────────────────── */
const CONCERN_TITLE_MAP: Record<string, string> = {
  "Hair / beard": "hair health",
  "Skin / acne": "skin & acne",
  "Energy / gut": "energy & gut",
  "Weight": "weight management",
  "Hormones": "hormonal balance",
  "Sleep / mind": "sleep & mind",
};

function buildProtocolTitle(profile: UserProfile | null): string {
  if (!profile) return "Your Protocol";
  const raw = profile.concerns ?? profile.concern;
  if (!raw) return "Your Protocol";
  const concerns = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (concerns.length === 0) return "Your Protocol";
  const labels = concerns.map((c) => CONCERN_TITLE_MAP[c] ?? c.toLowerCase());
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

function parseConcernList(profile: UserProfile | null): string[] {
  if (!profile) return [];
  const raw = profile.concerns ?? profile.concern;
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function splitSummary(text: string): { lead: string; insights: string[] } {
  const dotIdx = text.indexOf(". ");
  if (dotIdx === -1) return { lead: text, insights: [] };
  const lead = text.slice(0, dotIdx + 1);
  const rest = text.slice(dotIdx + 2);
  const insights = rest.split(". ").filter(Boolean).map((s) => (s.endsWith(".") ? s : `${s}.`));
  return { lead, insights };
}

/* ── Main page ─────────────────────────────────────────────── */
export default function ProtocolPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [protocol, setProtocol] = useState<GeneratedProtocol | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Per-supplement add-to-cart state
  const [itemStates, setItemStates] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});
  // "Add All" CTA state
  const [bulkState, setBulkState] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    let stored: UserProfile | null = null;
    try {
      const raw = sessionStorage.getItem("bh_profile");
      if (!raw) { router.replace("/home"); return; }
      stored = JSON.parse(raw) as UserProfile;
      setProfile(stored);
    } catch {
      router.replace("/home");
      return;
    }

    fetch("/api/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stored),
    })
      .then((r) => r.json())
      .then((data: GeneratedProtocol) => {
        setProtocol(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleAnswer = useCallback((key: string, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [key]: value };
      // Persist answers back to sessionStorage profile
      try {
        const raw = sessionStorage.getItem("bh_profile");
        if (raw) {
          sessionStorage.setItem(
            "bh_profile",
            JSON.stringify({ ...JSON.parse(raw), [key]: value }),
          );
        }
      } catch { /* non-critical */ }
      return updated;
    });
  }, []);

  const handleAddSupplement = useCallback(async (supplementId: string) => {
    if (itemStates[supplementId] === "loading") return;
    setItemStates((prev) => ({ ...prev, [supplementId]: "loading" }));
    try {
      const variantId = await resolveVariantId(supplementId);
      if (!variantId) throw new Error("variant not found");
      await addItem(variantId, 1);
      setItemStates((prev) => ({ ...prev, [supplementId]: "done" }));
    } catch {
      setItemStates((prev) => ({ ...prev, [supplementId]: "error" }));
    } finally {
      setTimeout(() => setItemStates((prev) => ({ ...prev, [supplementId]: "idle" })), 2000);
    }
  }, [addItem, itemStates]);

  const handleAddAll = useCallback(async () => {
    if (bulkState !== "idle" || !protocol) return;
    setBulkState("loading");
    try {
      // Resolve all variant IDs in parallel
      const variantIds = await Promise.all(
        protocol.supplements.map((s) => resolveVariantId(s.id)),
      );
      // Add to cart sequentially to avoid race conditions during cart creation
      for (const variantId of variantIds) {
        if (variantId) await addItem(variantId, 1);
      }
      setBulkState("done");
      setTimeout(() => setBulkState("idle"), 3000);
    } catch {
      setBulkState("error");
      setTimeout(() => setBulkState("idle"), 2500);
    }
  }, [addItem, bulkState, protocol]);

  /* ── Derived state ─────────────────────────────────────────── */
  const mergedProfile: UserProfile = { ...profile, ...answers };
  const currentDepth = calculateProfileDepth(mergedProfile);

  const followUpQuestions = protocol?.followUpQuestions ?? [];
  const answeredCount = followUpQuestions.filter((q) => answers[q.key]).length;
  const currentQuestion = followUpQuestions.find((q) => !answers[q.key]);
  const allAnswered = followUpQuestions.length > 0 && answeredCount === followUpQuestions.length;

  const concernList = parseConcernList(profile);
  const { lead: summaryLead, insights: summaryInsights } = splitSummary(protocol?.summary ?? "");

  /* ── Loading ───────────────────────────────────────────────── */
  if (loading || !protocol) {
    return (
      <div className="min-h-dvh pb-24">
        <div className="sticky top-12 z-20 px-4 py-3 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-on-surface-variant">Building protocol…</span>
            <span className="text-xs font-bold text-primary-container animate-pulse">—</span>
          </div>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-primary-container to-primary rounded-full animate-pulse" />
          </div>
        </div>
        <ProtocolSkeleton />
      </div>
    );
  }

  /* ── Rendered protocol ─────────────────────────────────────── */
  return (
    <div className="min-h-dvh pb-24">

      {/* ── Sticky progress bar ── */}
      <div className="sticky top-12 z-20 px-4 py-3 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-on-surface-variant">Protocol Depth</span>
          <span className="text-xs font-bold text-primary-container">{currentDepth.total}%</span>
        </div>
        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${currentDepth.total}%` }}
          />
        </div>
        {currentDepth.total < 100 && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-on-surface-variant/50 truncate flex-1">
              {currentDepth.nextStep}
            </p>
            {currentQuestion && (
              <button
                onClick={() => document.getElementById("protocol-question")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[10px] font-semibold text-primary-container ml-2 shrink-0 cursor-pointer hover:underline"
              >
                Improve →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">

        {/* ── Back ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-3 text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back</span>
        </button>

        {/* ── Smart personalisation CTA ── */}
        {currentQuestion && currentDepth.total < 75 && (
          <div className="feed-card-ai p-4 mb-3 animate-fade-in-up">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-container shrink-0" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-primary-container">Unlock deeper personalisation</p>
              </div>
              <span className="text-[9px] font-bold text-primary-container bg-primary-container/10 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">
                +{Math.min(Math.round((75 - currentDepth.total) / 2), 20)}%
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">{currentDepth.nextStep}</p>
            <button
              onClick={() => document.getElementById("protocol-question")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-2 text-[11px] font-semibold text-primary-container cursor-pointer hover:underline"
            >
              Answer now →
            </button>
          </div>
        )}

        {/* ── AI Summary ── */}
        <div className="feed-card-ai p-5 mb-3 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-container/20 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary-container uppercase tracking-wider mb-1">
                Your Protocol
              </p>
              <h1 className="text-xl font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-tight mb-2 capitalize">
                {buildProtocolTitle(profile)}
              </h1>
              {concernList.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {concernList.map((c) => (
                    <span key={c} className="text-[10px] font-semibold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm font-medium text-on-surface leading-relaxed">
                {summaryLead}
              </p>
              {summaryInsights.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {summaryInsights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-container/40 shrink-0 mt-1.5" />
                      <p className="text-xs text-on-surface-variant/80 leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              )}
              {protocol.explanation && (
                <p className="text-xs text-on-surface-variant/70 mt-2 leading-relaxed border-t border-outline-variant/10 pt-2">
                  {protocol.explanation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Follow-up question ── */}
        {!allAnswered && currentQuestion && (
          <div
            id="protocol-question"
            key={currentQuestion.key}
            className="feed-card p-5 mb-3 animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-primary-container uppercase tracking-wider">
                Personalising · {answeredCount + 1} of {followUpQuestions.length}
              </span>
            </div>
            <p className="text-base font-semibold text-on-surface leading-snug mb-4 font-[family-name:var(--font-manrope)]">
              {currentQuestion.question}
            </p>
            <div className="space-y-2">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(currentQuestion.key, opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-sm font-medium text-on-surface hover:border-primary-container/40 cursor-pointer transition-all duration-200 active:scale-[0.99]"
                >
                  <span>{opt.label}</span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant/30" strokeWidth={1.5} />
                </button>
              ))}
            </div>
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {followUpQuestions.map((q) => (
                <div
                  key={q.key}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    answers[q.key]
                      ? "w-4 bg-primary-container"
                      : q.key === currentQuestion.key
                        ? "w-4 bg-primary-container/40"
                        : "w-1.5 bg-surface-container-high"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── All questions answered ── */}
        {allAnswered && (
          <div className="feed-card-ai p-4 mb-3 animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-primary-container" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Protocol fully personalised</p>
                <p className="text-xs text-on-surface-variant">{protocol.confidenceMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Daily Routine ── */}
        <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
            Daily Routine
          </p>
          <div className="feed-card divide-y divide-outline-variant/8">
            {protocol.dailyRoutine.map((item, i) => {
              const Icon = item.time === "morning" ? Sun : item.time === "afternoon" ? Zap : Moon;
              const timeLabel =
                item.time === "morning" ? "Morning" : item.time === "afternoon" ? "Afternoon" : "Evening";
              const iconBg =
                item.time === "morning"
                  ? "bg-amber-500/10"
                  : item.time === "afternoon"
                    ? "bg-blue-500/10"
                    : "bg-indigo-500/10";
              const iconColor =
                item.time === "morning"
                  ? "text-amber-600"
                  : item.time === "afternoon"
                    ? "text-blue-600"
                    : "text-indigo-600";

              return (
                <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${iconBg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                      {timeLabel}
                    </p>
                    <p className="text-sm text-on-surface leading-relaxed">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Lifestyle Tips ── */}
        <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
            Lifestyle Tips
          </p>
          <div className="feed-card p-4">
            <div className="space-y-3">
              {protocol.lifestyle.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary-container">{i + 1}</span>
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Blood report upload ── */}
        {!profile?.bloodReport && (
          <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <div className="feed-card p-4 border border-primary-container/20">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-container/10 flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface">Upload blood report</p>
                    <span className="text-[9px] font-bold text-primary-container bg-primary-container/10 px-1.5 py-0.5 rounded">
                      +15% accuracy
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Unlock a fully personalised protocol based on your actual biomarkers.
                  </p>
                </div>
                <button className="shrink-0 text-[11px] font-semibold text-primary-container border border-primary-container/30 px-2.5 py-1.5 rounded-lg hover:bg-primary-container/10 transition-colors cursor-pointer whitespace-nowrap">
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Supplement Recommendations ── */}
        {protocol.supplements.length > 0 && (
          <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
              Recommended Supplements
            </p>
            <div className="feed-card divide-y divide-outline-variant/8">
              {protocol.supplements.map((s, i) => {
                const itemState = itemStates[s.id] ?? "idle";
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-primary-container" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-on-surface">{s.name}</p>
                        {s.priority === "essential" && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-primary-container bg-primary-container/10 px-1.5 py-0.5 rounded">
                            Essential
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant/60">
                        {s.brand}
                        {s.price > 0 && ` · ₹${s.price}`}
                        {s.timing && ` · ${s.timing}`}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                        {s.reasoning}
                      </p>
                      {s.reasonTags && s.reasonTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.reasonTags.map((tag) => (
                            <span key={tag} className="text-[9px] font-medium text-on-surface-variant/60 bg-surface-container-high px-1.5 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddSupplement(s.id)}
                      disabled={itemState === "loading"}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container-lowest border border-outline-variant/15 hover:bg-primary-container hover:border-primary-container transition-all duration-200 cursor-pointer active:scale-90 disabled:cursor-default shrink-0 mt-0.5 group/btn"
                      aria-label={`Add ${s.name} to cart`}
                    >
                      {itemState === "loading" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-on-surface-variant" strokeWidth={2} />
                      ) : itemState === "done" ? (
                        <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
                      ) : itemState === "error" ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
                      ) : (
                        <ShoppingBag className="w-3.5 h-3.5 text-on-surface-variant group-hover/btn:text-white transition-colors" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div className="pb-4 animate-fade-in-up" style={{ animationDelay: "450ms" }}>
          <button
            onClick={handleAddAll}
            disabled={bulkState === "loading"}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary-container text-sm font-bold text-white hover:bg-primary transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {bulkState === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                Adding to cart…
              </>
            ) : bulkState === "done" ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Added to cart
              </>
            ) : bulkState === "error" ? (
              <>
                <AlertCircle className="w-4 h-4" strokeWidth={2} />
                Could not add — try again
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                Shop Your Recommended Supplements
              </>
            )}
          </button>
          <p className="text-[11px] text-on-surface-variant text-center mt-2">
            Free shipping · Doctor-approved · Cancel anytime
          </p>
        </div>


      </div>
    </div>
  );
}
