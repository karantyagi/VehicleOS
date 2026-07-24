"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pwaConfig } from "@/lib/pwa-config";
import { usePwaInstallPrompt } from "@/lib/use-pwa-install-prompt";

type PwaInstallBannerProps = {
  enabled?: boolean;
};

export function PwaInstallBanner({ enabled = true }: PwaInstallBannerProps) {
  const { platform, isVisible, canNativeInstall, install, dismiss } = usePwaInstallPrompt(enabled);

  if (!isVisible) return null;

  const title =
    platform === "ios"
      ? "Add to Home Screen"
      : canNativeInstall
        ? "Install on your phone"
        : "Open like an app";

  const description =
    platform === "ios"
      ? `Install ${pwaConfig.shortName} for receipt capture and reminders without the browser chrome. Tap Share, then Add to Home Screen.`
      : canNativeInstall
        ? `Install ${pwaConfig.shortName} for quick receipt capture and a full-screen assistant workspace.`
        : `Use Chrome menu → Install app, or Add to Home Screen, for a full-screen ${pwaConfig.shortName} icon.`;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {platform === "ios" ? <Share className="h-4 w-4" aria-hidden /> : <Smartphone className="h-4 w-4" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canNativeInstall ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  void install();
                }}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Install app
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
