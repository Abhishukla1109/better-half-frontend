'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, User, Menu, X } from 'lucide-react';
import CartButton from '@/components/cart/CartButton';
import { supabase } from '@/lib/supabase/client';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setIsLoggedIn(true); return; }
      // demo fallback
      try { if (JSON.parse(localStorage.getItem('bh_auth') || '{}').loggedIn) setIsLoggedIn(true); } catch { /* ignore */ }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      {/* Main nav row */}
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 text-xl font-extrabold text-brand tracking-tight mr-2">
          BetterHalf
        </Link>

        {/* Search bar — desktop */}
        <div className="hidden md:flex flex-1 max-w-xl relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, concerns, brands…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-teal border border-border-light rounded-xl text-sm focus:outline-none focus:border-brand focus:bg-white transition-all"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(s => !s)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-teal text-gray-700 transition-colors"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          {isLoggedIn ? (
            <Link
              href="/protocol"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-brand hover:bg-surface-teal transition-colors"
            >
              <User size={16} />
              <span>My protocol</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-surface-teal transition-colors"
            >
              <User size={16} />
              <span>Sign in</span>
            </Link>
          )}

          <CartButton />

          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-teal text-gray-700"
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
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search products…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface-teal border border-border-light rounded-xl text-sm focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      )}

      {/* Secondary nav links — desktop */}
      <nav className="hidden md:flex border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center gap-0">
          {NAV_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-brand hover:bg-surface-teal transition-colors whitespace-nowrap first:pl-0"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white">
          {NAV_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-surface-teal border-b border-gray-100 last:border-0"
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <Link
              href="/protocol"
              onClick={() => setMobileOpen(false)}
              className="block px-5 py-4 text-sm font-semibold text-brand"
            >
              👤 My protocol
            </Link>
          ) : (
            <Link
              href="/auth"
              onClick={() => setMobileOpen(false)}
              className="block px-5 py-4 text-sm font-semibold text-brand"
            >
              👤 Sign in / Register
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
