"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileSidebar, Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PlatformEntryBanner } from "@/components/platform/platform-entry-banner";
import { getDepartmentFromPath } from "@/lib/constants/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const department = getDepartmentFromPath(pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const openSidebar = () => setMobileSidebarOpen(true);
    window.addEventListener("hms:open-mobile-sidebar", openSidebar);
    return () => window.removeEventListener("hms:open-mobile-sidebar", openSidebar);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setMobileSidebarOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div data-department={department} className="h-screen overflow-hidden bg-background">
      <div className="flex h-full min-h-0">
        <Sidebar />
        <MobileSidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <PlatformEntryBanner />
          <Topbar />
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24 sm:px-6 sm:py-5 xl:px-8 xl:py-7 xl:pb-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
