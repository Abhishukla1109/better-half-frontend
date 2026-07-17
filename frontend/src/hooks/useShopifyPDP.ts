"use client";

import { useState, useEffect } from "react";
import type { EnrichedPDP } from "@/data/enrichedProducts";

const _cache = new Map<string, EnrichedPDP>();

export function useShopifyPDP(slug: string): { enriched: EnrichedPDP | null; pdpLoading: boolean } {
  const [enriched, setEnriched] = useState<EnrichedPDP | null>(_cache.get(slug) ?? null);
  const [pdpLoading, setPdpLoading] = useState(!_cache.has(slug));

  useEffect(() => {
    if (_cache.has(slug)) {
      setEnriched(_cache.get(slug)!);
      setPdpLoading(false);
      return;
    }

    let cancelled = false;
    setPdpLoading(true);

    fetch(`/api/shopify/pdp?handle=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: EnrichedPDP | null) => {
        if (cancelled) return;
        if (data) _cache.set(slug, data);
        setEnriched(data);
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
