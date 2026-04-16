import { useLayout } from "@/context/layout-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import { useTranslatedSidebar } from "./use-translated-sidebar";

export function AppSidebar() {
  const { collapsible, layout } = useLayout();
  const translated = useTranslatedSidebar(sidebarData);

  const variant =
    layout === "full" ? "inset" : layout === "compact" ? "floating" : "sidebar";

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={translated.teams} />
      </SidebarHeader>

      <SidebarContent>
        {translated.navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={translated.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
