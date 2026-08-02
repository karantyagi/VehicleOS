import { cn } from "@/lib/utils";
import { EXTRACTION_STATUS, type ExtractionStatusVariant } from "@/lib/extraction-status";

type ExtractionStatusBannerProps = {
  variant: ExtractionStatusVariant;
  className?: string;
};

export function ExtractionStatusBanner({ variant, className }: ExtractionStatusBannerProps) {
  const content = EXTRACTION_STATUS[variant];

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground",
        className,
      )}
      role="status"
    >
      <p className="font-medium">{content.title}</p>
      <p className="mt-1 text-muted-foreground">{content.body}</p>
      {content.attribution ? (
        <a
          href={content.attribution.href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-history-highlight underline-offset-2 hover:underline"
        >
          {content.attribution.label}
        </a>
      ) : null}
    </div>
  );
}
