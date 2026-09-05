export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">{title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{updated}</p>
      <div className="prose-legal mt-8 space-y-4 text-ink [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:text-ink">
        {children}
      </div>
    </div>
  );
}

export function LegalNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 rounded-2xl border border-sunshine-deep/40 bg-sunshine/15 p-4 text-sm text-ink">
      {children}
    </div>
  );
}
