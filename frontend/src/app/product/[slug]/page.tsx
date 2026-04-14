export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="min-h-dvh bg-surface">
      <div className="px-6 pt-8">
        <h1 className="text-2xl font-extrabold text-primary tracking-tight font-[family-name:var(--font-manrope)]">
          Product: {slug}
        </h1>
        <p className="text-on-surface-variant mt-2">
          Product detail page — coming soon.
        </p>
      </div>
    </div>
  );
}
