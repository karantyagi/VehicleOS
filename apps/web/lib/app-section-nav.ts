import { APP_SECTIONS, type AppSection } from "@/lib/store/app-ui-store";

export const dashboardSectionHref = (section: AppSection): string => `/?section=${section}`;

export const parseDashboardSection = (search: string): AppSection | null => {
  const section = new URLSearchParams(search).get("section");
  return APP_SECTIONS.some((entry) => entry.id === section) ? (section as AppSection) : null;
};

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
