import Link from "next/link";
import type { ReactNode } from "react";
import type { ItemOption } from "@/lib/domain/types";
import { NewItemMenu } from "@/components/items/new-item-menu";
import { BottomNav, SidebarNav } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/**
 * App shell (spec §12).
 *
 * - Desktop/tablet: left sidebar + top bar with app name, theme toggle and
 *   the primary "New" action.
 * - Mobile: top bar with app name + theme toggle, bottom navigation and a
 *   floating action button.
 */
export function AppShell({
  children,
  projects,
}: {
  children: ReactNode;
  projects: ItemOption[];
}) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-sidebar/60 px-3 py-4 md:flex">
        <Link
          href="/queue"
          className="mb-4 rounded-sm px-3 text-[15px] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          NoX Organizer
        </Link>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <Link
            href="/queue"
            className="rounded-sm text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-[15px]"
          >
            NoX Organizer
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <div className="hidden md:block">
              <NewItemMenu variant="topbar" projects={projects} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 md:px-6 md:pb-12">
          {children}
        </main>

        <div className="sticky bottom-0 z-30 md:hidden">
          <BottomNav />
        </div>
      </div>

      {/* Mobile floating action button + bottom sheet */}
      <div className="md:hidden">
        <NewItemMenu variant="fab" projects={projects} />
      </div>
    </div>
  );
}
