export function H01HeroHeadline({ title, firstLine, secondLine }: { title: string; firstLine: string; secondLine: string }) {
  return (
    <h1
      aria-label={title}
      className="max-w-2xl font-[family-name:var(--font-display)] text-[clamp(2.65rem,7vw,5rem)] font-bold leading-[0.98] tracking-[-0.055em]"
    >
      <span aria-hidden="true">
        <span data-hero-first-line>{firstLine}</span>
        <br />
        <span data-hero-second-line>{secondLine}</span>
      </span>
      <span aria-hidden="true" data-hero-lime-dot className="ml-1 inline-block h-3 w-3 rounded-full bg-[var(--color-primary)] align-baseline" />
    </h1>
  );
}
