"use client";

import { useState, useEffect } from "react";
import type { EnrichedPDP } from "@/data/enrichedProducts";
import { getEnrichedPDP } from "@/data/enrichedProducts";

// In-memory cache — survives re-renders, cleared on page refresh
const _cache = new Map<string, EnrichedPDP>();

const BAD_TIMELINE_TERMS = [
  "app will be a partner", "reminders & rewards", "save upto 30%", "wallet on our app",
  "fast results", "solve the problem equally", "won't completely stop", "wont completely stop",
  "transform you overnight", "transform your skin overnight", "replace your diet",
  "help you avoid the treadmill", "doesn't replace your expert", "doesn't act as a lubricant",
  "doesn't decrease sensitivity", "treat blemish overnight", "won't stop blemish",
  "wont stop blemish", "find true love", "make hair look better in a day",
  "give results overnight", "replace your hair care regimen", "won't make you powerful",
  "wont make you powerful", "become a one time solution", "replace your laundary",
  "stop aging", "replace a healthy meal",
];
function isCleanTimeline(tl: EnrichedPDP["timeline"]): boolean {
  if (!tl?.length) return false;
  return !tl.some(s => {
    const text = ((s.title ?? "") + " " + (s.period ?? "")).toLowerCase();
    // Block known bad marketing/promo phrases
    if (BAD_TIMELINE_TERMS.some(term => text.includes(term))) return true;
    // Block customer testimonial format: "Name, Age" or "Name, Age, City"
    if (/^[a-z][a-z\s]+,\s*\d{2}/.test(text.trim())) return true;
    return false;
  });
}

function merge(remote: EnrichedPDP, local: EnrichedPDP): EnrichedPDP {
  const remoteTimeline = isCleanTimeline(remote.timeline) ? remote.timeline : [];
  return {
    ...remote,
    // Fall back to local JSON for any field that came back empty from Shopify
    subtitle:       remote.subtitle       || local.subtitle,
    images:         remote.images?.length ? remote.images : local.images,
    ingredients:    remote.ingredients?.length ? remote.ingredients : local.ingredients,
    timeline:       remoteTimeline.length ? remoteTimeline : local.timeline,
    faqs:           remote.faqs?.length ? remote.faqs : local.faqs,
    reviews:        remote.reviews?.length ? remote.reviews : local.reviews,
    badges:         remote.badges?.length ? remote.badges : local.badges,
    disclaimers:    remote.disclaimers?.length ? remote.disclaimers : local.disclaimers,
    additionalInfo: remote.additionalInfo?.length ? remote.additionalInfo : local.additionalInfo,
    howToUse:       remote.howToUse || local.howToUse,
    productDetails: (remote.productDetails?.details?.length || remote.productDetails?.description?.length)
      ? remote.productDetails
      : local.productDetails,
    rating:         (remote.rating?.average != null) ? remote.rating : local.rating,
    price:          remote.price ?? local.price,
    forWith:        remote.forWith ?? local.forWith,
    recommendation: remote.recommendation ?? local.recommendation,
    ageGroup:       remote.ageGroup ?? local.ageGroup,
    allergens:      remote.allergens ?? local.allergens,
    productType:    remote.productType ?? local.productType,
    benefits:       remote.benefits?.length ? remote.benefits : local.benefits,
  };
}

export function useShopifyPDP(slug: string): { enriched: EnrichedPDP | null; pdpLoading: boolean } {
  const local = getEnrichedPDP(slug);
  const [enriched, setEnriched] = useState<EnrichedPDP | null>(_cache.get(slug) ?? local);
  const [pdpLoading, setPdpLoading] = useState(!_cache.has(slug) && local == null);

  useEffect(() => {
    if (_cache.has(slug)) {
      setEnriched(_cache.get(slug)!);
      setPdpLoading(false);
      return;
    }

    // If we have local JSON, show it immediately — don't wait for network
    if (local) setEnriched(local);

    let cancelled = false;
    const shopifyHandle = local?.shopifyHandle ?? slug;
    const variantTitle  = local?.variantTitle;
    const apiUrl = `/api/shopify/pdp?handle=${encodeURIComponent(shopifyHandle)}`
      + (variantTitle ? `&variant=${encodeURIComponent(variantTitle)}` : "");
    fetch(apiUrl)
      .then((r) => r.json())
      .then((data: EnrichedPDP | null) => {
        if (cancelled) return;
        const merged = data
          ? local ? merge(data, local) : data
          : local;
        if (merged) _cache.set(slug, merged);
        setEnriched(merged);
        setPdpLoading(false);
      })
      .catch(() => {
        if (!cancelled) setPdpLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return { enriched, pdpLoading };
}
