import { useRef, useCallback } from "react";

/**
 * Returns a ref to attach to the next section and a scroll function
 * to call after a single-select option is chosen.
 * Delays scroll slightly so the selection state renders first.
 */
export function useAutoScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  const scrollToNext = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150); // let selection state paint first
    });
  }, []);

  return { ref, scrollToNext };
}
