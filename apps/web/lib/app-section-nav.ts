import type { AppSection } from "@/lib/store/app-ui-store";

export const dashboardSectionHref = (section: AppSection): string => `/?section=${section}`;

type SectionRouter = {
  push: (href: string) => void;
};

export const navigateToAppSection = (input: {
  pathname: string;
  section: AppSection;
  router: SectionRouter;
  setActiveSection: (section: AppSection) => void;
}): void => {
  if (input.pathname === "/") {
    input.setActiveSection(input.section);
    return;
  }
  input.router.push(dashboardSectionHref(input.section));
};

export const isAppSectionActive = (input: {
  pathname: string;
  section: AppSection;
  activeSection: AppSection;
}): boolean => input.pathname === "/" && input.activeSection === input.section;
