"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getDepartmentFromPath } from "@/lib/constants/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const department = getDepartmentFromPath(pathname);

  return (
    <div data-department={department} className="h-screen overflow-hidden bg-background">
      <div className="flex h-full">
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
