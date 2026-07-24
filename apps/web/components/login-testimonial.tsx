/** Static brand panel copy until real user testimonials exist (post–early access). */
export function LoginTestimonial() {
  return (
    <figure className="relative mx-auto w-full max-w-[28rem] px-6 text-center lg:px-8">
      <span
        className="pointer-events-none absolute -left-1 top-0 select-none font-serif text-[7rem] leading-none text-primary/15 lg:-left-3 lg:text-[8.5rem]"
        aria-hidden
      >
        &ldquo;
      </span>
      <blockquote className="relative text-balance text-[1.25rem] font-light leading-[1.45] tracking-[-0.01em] text-muted-foreground lg:text-[1.5rem] lg:leading-[1.45]">
        We built Vehicle OS so service history, receipts, and what the manual actually says live in one place — not
        scattered across glove boxes and camera rolls.
      </blockquote>
      <figcaption className="mt-9 flex items-center justify-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[10px] font-semibold uppercase tracking-wide text-primary"
          aria-hidden
        >
          vo
        </span>
        <span className="text-[13px] font-medium tracking-tight text-muted-foreground/80">Vehicle OS team</span>
      </figcaption>
    </figure>
  );
}
