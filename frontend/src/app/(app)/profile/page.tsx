import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="px-6 pt-8">
      <h1 className="text-title font-extrabold text-primary tracking-tight font-[family-name:var(--font-manrope)]">
        Profile
      </h1>
      <p className="text-body text-on-surface-variant mt-2 mb-8">
        Your health profile builds progressively across sessions.
      </p>

      {/* Profile sections placeholder */}
      <div className="space-y-4">
        {[
          { icon: "person", label: "Health Profile", desc: "Edit your basics" },
          {
            icon: "inventory_2",
            label: "Order History",
            desc: "Past purchases",
          },
          { icon: "settings", label: "Settings", desc: "App preferences" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-4 p-5 bg-surface-container-lowest rounded-xl shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">
                {item.icon}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-on-surface">{item.label}</p>
              <p className="text-lead text-on-surface-variant">{item.desc}</p>
            </div>
            <span className="material-symbols-outlined text-outline-variant">
              chevron_right
            </span>
          </div>
        ))}
      </div>

      {/* Legal links */}
      <div className="mt-10 pb-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {[
          { label: "Privacy Policy",  href: "/privacy" },
          { label: "Terms & Conditions", href: "/terms" },
          { label: "Returns & Refunds",  href: "/returns" },
          { label: "Contact Us",      href: "/contact" },
          { label: "About Us",        href: "/about" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="text-label text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
            {link.label}
          </Link>
        ))}
        <span className="w-full text-center text-label text-on-surface-variant/25 mt-1">v1.0</span>
      </div>
    </div>
  );
}
