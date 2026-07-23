/** Static brand panel copy until real user testimonials exist (post–early access). */
export function LoginTestimonial() {
  return (
    <figure className="relative mx-auto w-full max-w-[32rem] px-6 text-center lg:px-10">
      <span
        className="pointer-events-none absolute -left-1 top-0 select-none font-serif text-[7.5rem] leading-none text-muted-foreground/20 lg:-left-4 lg:text-[9rem]"
        aria-hidden
      >
        &ldquo;
      </span>
      <blockquote className="relative text-balance text-[1.35rem] font-normal leading-snug tracking-tight text-foreground lg:text-[1.65rem] lg:leading-snug">
        We built Vehicle OS so service history, receipts, and what the manual actually says live in one place — not
        scattered across glove boxes and camera rolls.
      </blockquote>
      <figcaption className="mt-10 flex items-center justify-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          aria-hidden
        >
          vo
        </span>
        <span className="text-sm text-muted-foreground">Vehicle OS team</span>
      </figcaption>
    </figure>
  );
}
