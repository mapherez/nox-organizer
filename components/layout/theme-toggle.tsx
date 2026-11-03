"use client";

import * as React from "react";
import {
  Check,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type ThemeOption = "system" | "light" | "dark";

const OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const emptySubscribe = () => () => {};

/**
 * Theme switcher (spec §18): system / light / dark, persisted by
 * next-themes. `useSyncExternalStore` provides a hydration-safe "mounted"
 * flag without a setState-in-effect.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Theme" disabled>
        <Monitor className="size-4" />
      </Button>
    );
  }

  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <current.icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
          >
            <option.icon className="size-4" />
            <span className="flex-1">{option.label}</span>
            {theme === option.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
