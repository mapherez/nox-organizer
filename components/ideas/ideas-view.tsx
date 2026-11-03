"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { changeStatus } from "@/lib/actions/items";
import type { ItemOption, ItemView, Status } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { ItemActions } from "@/components/items/item-actions";
import { ItemFormDialog, type ItemFormMode } from "@/components/items/item-form-dialog";
import { StatusBadge } from "@/components/items/badges";
import { cn } from "cn";

type IdeaFilter = "all" | Status;

const FILTERS: { id: IdeaFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "backlog", label: "Backlog" },
  { id: "queued", label: "Queued" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "dropped", label: "Dropped" },
];

const STATUS_RANK: Record<Status, number> = {
  in_progress: 0,
  queued: 1,
  backlog: 2,
  done: 3,
  dropped: 4,
};

/**
 * Ideas view (spec §15).
 * Filter chips across all statuses (default: All). Each row shows the
 * linked project name, or "Standalone idea" when unlinked.
 */
export function IdeasView({
  items,
  projects,
}: {
  items: ItemView[];
  projects: ItemOption[];
}) {
  const [filter, setFilter] = React.useState<IdeaFilter>("all");
  const [formMode, setFormMode] = React.useState<ItemFormMode | null>(null);
  const [editItem, setEditItem] = React.useState<ItemView | null>(null);

  const ideasList = React.useMemo(
    () =>
      items
        .filter((item) => item.kind === "idea")
        .filter((item) => filter === "all" || item.status === filter)
        .sort((a, b) => {
          const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
          if (rank !== 0) return rank;
          if (a.status === "queued" && b.status === "queued") {
            return (a.position ?? 0) - (b.position ?? 0);
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    [items, filter],
  );

  function handleStatus(item: ItemView, to: Status) {
    setEditItem(null);
    void changeStatus(item.id, to).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }

  const filterLabel = FILTERS.find((f) => f.id === filter)?.label ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter ideas">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-8 rounded-full border px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f.id
                  ? "border-transparent bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setFormMode("create-idea")}>New Idea</Button>
      </div>

      {ideasList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <h2 className="text-lg font-semibold">
            {filter === "all" ? "No ideas yet." : `No ${filterLabel.toLowerCase()} ideas.`}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Capture a new project idea or improvement.
          </p>
          <Button onClick={() => setFormMode("create-idea")}>New Idea</Button>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card px-4 shadow-sm">
          {ideasList.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2.5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/items/${item.id}`}
                    className="truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.linkedProjectTitle ? (
                    <>
                      Linked to{" "}
                      <span className="font-medium text-foreground">
                        {item.linkedProjectTitle}
                      </span>
                    </>
                  ) : (
                    "Standalone idea"
                  )}
                </p>
              </div>
              <ItemActions
                item={item}
                onStatus={handleStatus}
                onEdit={setEditItem}
                className="shrink-0"
              />
            </div>
          ))}
        </div>
      )}

      <ItemFormDialog
        open={formMode !== null}
        onOpenChange={(open) => !open && setFormMode(null)}
        mode={formMode ?? "create-idea"}
        projects={projects}
      />
      <ItemFormDialog
        open={editItem !== null}
        onOpenChange={(open) => !open && setEditItem(null)}
        mode="edit"
        initial={editItem ?? undefined}
        projects={projects}
      />
    </div>
  );
}
