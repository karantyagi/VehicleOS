"use client";

import { useEffect } from "react";

type UseConsoleListKeyboardOptions = {
  rowIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  enabled?: boolean;
};

export function useConsoleListKeyboard({
  rowIds,
  selectedId,
  onSelect,
  enabled = true,
}: UseConsoleListKeyboardOptions) {
  useEffect(() => {
    if (!enabled || rowIds.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.key !== "j" && event.key !== "k") return;
      event.preventDefault();

      const currentIndex = selectedId ? rowIds.indexOf(selectedId) : -1;
      const delta = event.key === "j" ? 1 : -1;
      const nextIndex =
        currentIndex === -1
          ? delta > 0
            ? 0
            : rowIds.length - 1
          : Math.min(rowIds.length - 1, Math.max(0, currentIndex + delta));
      onSelect(rowIds[nextIndex] ?? rowIds[0]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onSelect, rowIds, selectedId]);
}
