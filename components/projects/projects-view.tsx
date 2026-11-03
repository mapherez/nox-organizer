"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { changeStatus } from "@/lib/actions/items";
import type { ItemOption, ItemView, Status } from "@/lib/domain/types";
import { timeAgo } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { ItemActions } from "@/components/items/item-actions";
import { ItemFormDialog, type ItemFormMode } from "@/components/items/item-form-dialog";
import { StatusBadge } from "@/components/items/badges";
import { cn } from "cn";

type ProjectFilter = "current" | "backlog" | "done" | "dropped" | "all";

const FILTERS: { id: ProjectFilter; label: string }[] = [
  { id: "current", label: "Current" },
  { id: "backlog", label: "Backlog" },
  { id: "done", label: "Done" },
  { id: "dropped", label: "Dropped" },
  { id: "all", label: "All" },
];

function matches(status: Status, filter: ProjectFilter): boolean {
  switch (filter) {
    case "current":
      return status === "in_progress" || status === "queued";
    case "backlog":
      return status === "backlog";
    case "done":
      return status === "done";
    case "dropped":
      return status === "dropped";
    case "all":
      return true;
  }
}

const STATUS_RANK: Record<Status, number> = {
  in_progress: 0,
  queued: 1,
  backlog: 2,
  done: 3,
  dropped: 4,
};

/**
 * Projects view (spec §14).
 * Filter chips: Current (default), Backlog, Done, Dropped, All.
 */
export function ProjectsView({
  items,
  projects,
}: {
  items: ItemView[];
  projects: ItemOption[];
}) {
  const [filter, setFilter] = React.useState<ProjectFilter>("current");
  const [formMode, setFormMode] = React.useState<ItemFormMode | null>(null);
  const [editItem, setEditItem] = React.useState<ItemView | null>(null);

  const projectsList = React.useMemo(
    () =>
      items
        .filter((item) => item.kind === "project")
        .filter((item) => matches(item.status, filter))
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
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter projects">
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
        <Button onClick={() => setFormMode("create-project")}>New Project</Button>
      </div>

      {projectsList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <h2 className="text-lg font-semibold">
            {filter === "all" ? "No projects yet." : `No ${filterLabel} projects.`}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add your first project to start tracking work.
          </p>
          <Button onClick={() => setFormMode("create-project")}>New Project</Button>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card px-4 shadow-sm">
          {projectsList.map((item) => (
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
                  {item.linkedIdeas.length === 0
                    ? "No linked ideas"
                    : `${item.linkedIdeas.length} linked idea${item.linkedIdeas.length === 1 ? "" : "s"}`}
                  {" · Updated "}
                  {timeAgo(item.updatedAt)}
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
        mode={formMode ?? "create-project"}
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
