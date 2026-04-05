import Link from "next/link";

export default function UseCaseLanding({
  title,
  subtitle,
  bullets,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
}) {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <section className="glass-panel border border-white/10 rounded-lg p-6 sm:p-10 bg-surface-container-low shadow-xl">
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">{title}</h1>
          <p className="mt-4 text-on-surface-variant text-base sm:text-lg">{subtitle}</p>

          <div className="mt-8 space-y-3">
            {bullets.map((item, index) => (
              <div key={`${item}-${index}`} className="border border-white/10 rounded-sm px-4 py-3 text-sm text-on-surface-variant">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/?tab=generate"
              className="px-4 py-3 bg-primary-container text-on-primary-container text-xs sm:text-sm font-bold uppercase tracking-widest rounded-sm"
            >
              Start Generating
            </Link>
            <Link
              href="/?tab=growth"
              className="px-4 py-3 border border-white/20 text-white text-xs sm:text-sm font-bold uppercase tracking-widest rounded-sm hover:border-primary-container hover:text-primary-container transition-all"
            >
              Open Growth Toolkit
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
