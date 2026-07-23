"use client";

import { useEffect } from "react";
import { APP_SECTIONS, SECTION_SHORTCUTS, useAppUiStore } from "@/lib/store/app-ui-store";

export function ConsoleKeyboardShortcuts() {
  const setCommandOpen = useAppUiStore((s) => s.setCommandOpen);
  const setActiveSection = useAppUiStore((s) => s.setActiveSection);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inField =
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (event.key === "/" && !inField && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;

      const section = APP_SECTIONS.find((entry) => SECTION_SHORTCUTS[entry.id] === event.key);
      if (section) {
        event.preventDefault();
        setActiveSection(section.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveSection, setCommandOpen]);

  return null;
}
