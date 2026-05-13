'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, User, Menu, X } from 'lucide-react';
import CartButton from '@/components/cart/CartButton';

const NAV_LINKS = [
  { label: '🏆 Best Sellers', href: '/explore?sort=bestseller' },
  { label: '🏷️ Offer Zone', href: '/explore?sale=true' },
  { label: '🤖 AI Health', href: '/home' },
  { label: '🌿 Brands', href: '/explore' },
  { label: '📖 Blog', href: '#' },
  { label: '💬 Support', href: '#' },
];

export default function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      {/* Main nav row */}
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 text-xl font-extrabold text-[#004f54] tracking-tight mr-2">
          BetterHalf
        </Link>

        {/* Search bar — desktop */}
        <div className="hidden md:flex flex-1 max-w-xl relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search products, concerns, brands…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#f7fafa] border border-[#e2e8e8] rounded-xl text-sm focus:outline-none focus:border-[#004f54] focus:bg-white transition-all"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(s => !s)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f7fafa] text-[#374151] transition-colors"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          <Link
            href="/auth"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#374151] hover:bg-[#f7fafa] transition-colors"
          >
            <User size={16} />
            <span>Sign in</span>
          </Link>

          <CartButton />

          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f7fafa] text-[#374151]"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              autoFocus
              type="text"
              placeholder="Search products…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#f7fafa] border border-[#e2e8e8] rounded-xl text-sm focus:outline-none focus:border-[#004f54]"
            />
          </div>
        </div>
      )}

      {/* Secondary nav links — desktop */}
      <nav className="hidden md:flex border-t border-[#f3f4f6]">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center gap-0">
          {NAV_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="px-4 py-2.5 text-sm font-medium text-[#374151] hover:text-[#004f54] hover:bg-[#f7fafa] transition-colors whitespace-nowrap first:pl-0"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[#f3f4f6] bg-white">
          {NAV_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-5 py-3.5 text-sm font-medium text-[#374151] hover:bg-[#f7fafa] border-b border-[#f3f4f6] last:border-0"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth"
            onClick={() => setMobileOpen(false)}
            className="block px-5 py-4 text-sm font-semibold text-[#004f54]"
          >
            👤 Sign in / Register
          </Link>
        </nav>
      )}
    </header>
  );
}
