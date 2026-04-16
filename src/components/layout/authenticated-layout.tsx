import type { ReactNode } from "react";
import { Suspense } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { getCookie } from "@/lib/cookies";
import { cn } from "@/lib/utils";
import { LayoutProvider } from "@/context/layout-provider";
import { SearchProvider } from "@/context/search-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SkipToMain } from "@/components/skip-to-main";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageFallback } from "@/components/page-fallback";

type AuthenticatedLayoutProps = {
  children?: ReactNode;
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie("sidebar_state") !== "false";
  const { pathname } = useLocation();

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              "@container/content",
              "min-w-0 w-full overflow-x-hidden",
              "has-[[data-layout=fixed]]:h-svh",
              "peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-2rem)]",
            )}
          >
            <ErrorBoundary resetKeys={[pathname]}>
              <Suspense fallback={<PageFallback />}>
                {children ?? <Outlet />}
              </Suspense>
            </ErrorBoundary>
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  );
}
