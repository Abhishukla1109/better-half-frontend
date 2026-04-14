import BottomNav from "@/components/layout/BottomNav";
import Header from "@/components/layout/Header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <BottomNav />
      <Header />
      {/* Main content: offset for header top + sidebar on desktop + bottom nav on mobile */}
      <main className="flex-1 pt-12 pb-[136px] lg:pb-0 lg:pt-12 lg:ml-[240px] xl:ml-[280px]">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
