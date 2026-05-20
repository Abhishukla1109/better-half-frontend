import BottomNav from "@/components/layout/BottomNav";
import Header from "@/components/layout/Header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-surface overflow-x-clip">
      <BottomNav />
      <Header />
      {/* Main content: offset for header top + sidebar on desktop + bottom nav on mobile */}
      <main className="flex-1 min-w-0 pt-12 pb-[68px] lg:pb-0 lg:pt-12 lg:ml-[240px] xl:ml-[280px]">
        <div className="max-w-2xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
