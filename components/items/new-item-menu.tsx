"use client";

import * as React from "react";
import { FolderPlus, Lightbulb, Plus } from "lucide-react";
import type { ItemOption } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ItemFormDialog, type ItemFormMode } from "./item-form-dialog";

interface NewItemMenuProps {
  /** Desktop: dropdown in the top bar. Mobile: floating action button. */
  variant: "topbar" | "fab";
  projects: ItemOption[];
}

/**
 * The primary create action (spec §12.4).
 * Desktop: a "New" button that opens a small menu.
 * Mobile: a floating action button that opens a bottom sheet with the
 * same two choices.
 */
export function NewItemMenu({ variant, projects }: NewItemMenuProps) {
  const [formMode, setFormMode] = React.useState<ItemFormMode | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  if (variant === "topbar") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setFormMode("create-project")}>
              <FolderPlus className="size-4" />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setFormMode("create-idea")}>
              <Lightbulb className="size-4" />
              New Idea
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ItemFormDialog
          open={formMode !== null}
          onOpenChange={(open) => {
            if (!open) setFormMode(null);
          }}
          mode={formMode ?? "create-project"}
          projects={projects}
        />
      </>
    );
  }

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-b-none rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>New</SheetTitle>
            <SheetDescription>What do you want to add?</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              size="lg"
              variant="outline"
              className="justify-start"
              onClick={() => {
                setSheetOpen(false);
                setFormMode("create-project");
              }}
            >
              <FolderPlus className="size-4" />
              New Project
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="justify-start"
              onClick={() => {
                setSheetOpen(false);
                setFormMode("create-idea");
              }}
            >
              <Lightbulb className="size-4" />
              New Idea
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <button
        type="button"
        aria-label="New item"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <ItemFormDialog
        open={formMode !== null}
        onOpenChange={(open) => {
          if (!open) setFormMode(null);
        }}
        mode={formMode ?? "create-project"}
        projects={projects}
      />
    </>
  );
}
