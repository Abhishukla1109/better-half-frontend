'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const MESSAGES = [
  '🎉 Free delivery on orders above ₹499',
  '🔬 Doctor-formulated supplements — FSSAI certified',
  '⚡ Build your AI health protocol in 60 seconds',
  '💊 6.5M+ users trust BetterHalf',
  '🚀 New arrivals: Little Joys NutriMix range',
];

export default function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % MESSAGES.length);
        setAnimating(false);
      }, 300);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-brand text-white text-xs md:text-sm font-medium px-4 py-2.5 flex items-center justify-center gap-3 relative">
      <span
        className={`transition-opacity duration-300 text-center ${animating ? 'opacity-0' : 'opacity-100'}`}
      >
        {MESSAGES[idx]}
      </span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Close announcement"
      >
        <X size={14} />
      </button>
    </div>
  );
}
