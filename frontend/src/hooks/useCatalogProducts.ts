"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/lib/protocolEngine";

// In-memory cache — survives re-renders, cleared on page refresh
let _cache: Product[] | null = null;
let _promise: Promise<Product[]> | null = null;

export function useCatalogProducts() {
  const [products, setProducts] = useState<Product[]>(_cache ?? []);
  const [loading, setLoading]   = useState(_cache === null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (_cache) {
      setProducts(_cache);
      setLoading(false);
      return;
    }

    if (!_promise) {
      _promise = fetch("/api/catalog")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<Product[]>;
        })
        .then((data) => {
          _cache = data;
          return data;
        })
        .catch((err) => {
          _promise = null; // allow retry on next mount
          throw err;
        });
    }

    _promise
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { products, loading, error };
}
