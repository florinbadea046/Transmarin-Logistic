// Rezolvă cheile i18n din `sidebarData` (RawSidebarData) într-o structură
// gata de randat (SidebarData cu stringuri traduse). Consumatori:
// AppSidebar si CommandMenu.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type {
  NavItem,
  RawNavItem,
  RawSidebarData,
  SidebarData,
} from "./types";

function translateNavItem(item: RawNavItem, t: TFunction): NavItem {
  const title = t(item.titleKey);
  if (item.url !== undefined) {
    return { title, url: item.url, icon: item.icon, badge: item.badge };
  }
  return {
    title,
    icon: item.icon,
    badge: item.badge,
    items: item.items.map((sub) => ({
      title: t(sub.titleKey),
      url: sub.url,
      icon: sub.icon,
      badge: sub.badge,
    })),
  };
}

export function useTranslatedSidebar(raw: RawSidebarData): SidebarData {
  const { t } = useTranslation();
  return useMemo<SidebarData>(
    () => ({
      user: raw.user,
      teams: raw.teams,
      navGroups: raw.navGroups.map((group) => ({
        title: t(group.titleKey),
        items: group.items.map((item) => translateNavItem(item, t)),
      })),
    }),
    [raw, t],
  );
}
