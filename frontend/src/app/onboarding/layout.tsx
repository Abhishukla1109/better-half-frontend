export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center min-h-dvh bg-surface lg:bg-surface-container-low lg:py-12">
      <div className="w-full max-w-[430px] flex flex-col min-h-dvh lg:min-h-0 bg-surface relative overflow-hidden lg:rounded-2xl lg:shadow-xl lg:border lg:border-outline-variant/10">
        {/* Decorative tonal blurs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-fixed/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-tertiary-fixed/10 rounded-full blur-[80px] pointer-events-none" />
        {children}
      </div>
    </div>
  );
}
