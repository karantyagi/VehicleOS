"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { isAppSectionActive, navigateToAppSection } from "@/lib/app-section-nav";
import { type AppSection, useAppUiStore } from "@/lib/store/app-ui-store";

export const useAppSectionNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const activeSection = useAppUiStore((state) => state.activeSection);
  const setActiveSection = useAppUiStore((state) => state.setActiveSection);

  const goToSection = useCallback(
    (section: AppSection) => {
      navigateToAppSection({ pathname, section, router, setActiveSection });
    },
    [pathname, router, setActiveSection],
  );

  const isSectionActive = useCallback(
    (section: AppSection) => isAppSectionActive({ pathname, section, activeSection }),
    [pathname, activeSection],
  );

  return {
    pathname,
    goToSection,
    isSectionActive,
    isDashboard: pathname === "/",
  };
};
