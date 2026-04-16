import type { ElementType } from "react";

// ── Common ──────────────────────────────────────────────────
type User = {
  name: string;
  email: string;
  avatar: string;
};

type Team = {
  name: string;
  logo: ElementType;
  plan: string;
};

// ── Raw (source) — ce scrie sidebar-data.ts (chei i18n, nu text tradus) ──
type RawBaseNavItem = {
  titleKey: string;
  badge?: string;
  icon?: ElementType;
};

type RawNavLink = RawBaseNavItem & {
  url: string;
  items?: never;
};

type RawNavCollapsible = RawBaseNavItem & {
  items: (RawBaseNavItem & { url: string })[];
  url?: never;
};

type RawNavItem = RawNavCollapsible | RawNavLink;

type RawNavGroup = {
  titleKey: string;
  items: RawNavItem[];
};

type RawSidebarData = {
  user: User;
  teams: Team[];
  navGroups: RawNavGroup[];
};

// ── Translated — consumat de NavGroup după rezolvarea cheilor cu t() ──
type BaseNavItem = {
  title: string;
  badge?: string;
  icon?: ElementType;
};

type NavLink = BaseNavItem & {
  url: string;
  items?: never;
};

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[];
  url?: never;
};

type NavItem = NavCollapsible | NavLink;

type NavGroup = {
  title: string;
  items: NavItem[];
};

type SidebarData = {
  user: User;
  teams: Team[];
  navGroups: NavGroup[];
};

export type {
  RawSidebarData,
  RawNavGroup,
  RawNavItem,
  SidebarData,
  NavGroup,
  NavItem,
  NavCollapsible,
  NavLink,
};
