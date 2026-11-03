"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Lightbulb, ListTodo } from "lucide-react";
import { cn } from "cn";

const LINKS = [
  { href: "/queue", label: "Work Queue", shortLabel: "Queue", icon: ListTodo },
  { href: "/projects", label: "Projects", shortLabel: "Projects", icon: FolderKanban },
  { href: "/ideas", label: "Ideas", shortLabel: "Ideas", icon: Lightbulb },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical links for the desktop sidebar. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(pathname, link.href) ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive(pathname, link.href)
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <link.icon className="size-4 shrink-0" />
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar for mobile. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="grid grid-cols-3 border-t bg-background/95 backdrop-blur"
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(pathname, link.href) ? "page" : undefined}
          className={cn(
            "flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive(pathname, link.href)
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <link.icon className="size-5" />
          {link.shortLabel}
        </Link>
      ))}
    </nav>
  );
}
