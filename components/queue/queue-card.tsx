"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { hasUnfinishedDependencies, unsatisfiedPrerequisites } from "@/lib/domain/queue";
import type { Status, ItemView } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { ItemActions } from "@/components/items/item-actions";
import { KindBadge, StatusBadge } from "@/components/items/badges";
import { cn } from "cn";

const MAX_BLOCKERS_SHOWN = 3;

interface QueueCardProps {
  item: ItemView;
  nextUp: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onStatus: (item: ItemView, to: Status) => void;
  onEdit: (item: ItemView) => void;
  onMove?: (item: ItemView, direction: "up" | "down") => void;
}

/** A card in the Work Queue (spec §13.3, §13.4, §13.5). */
export function QueueCard({
  item,
  nextUp,
  canMoveUp,
  canMoveDown,
  onStatus,
  onEdit,
  onMove,
}: QueueCardProps) {
  const waitingOn = unsatisfiedPrerequisites(item);
  const shown = waitingOn.slice(0, MAX_BLOCKERS_SHOWN);
  const extra = waitingOn.length - shown.length;
  const inProgressWarning =
    item.status === "in_progress" && hasUnfinishedDependencies(item);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors",
        nextUp && "border-primary/60 ring-1 ring-primary/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {nextUp && (
          <Badge className="shrink-0">Next up</Badge>
        )}
        <Link
          href={`/items/${item.id}`}
          className="min-w-0 flex-1 truncate text-base font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          title={item.title}
        >
          {item.title}
        </Link>
        <KindBadge kind={item.kind} />
        <StatusBadge status={item.status} />
      </div>

      {item.kind === "idea" && item.linkedProjectTitle && (
        <p className="text-sm text-muted-foreground">
          Linked to{" "}
          <span className="font-medium text-foreground">
            {item.linkedProjectTitle}
          </span>
        </p>
      )}

      {waitingOn.length > 0 && item.status === "queued" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Waiting on:
          </span>
          {shown.map((dep) => (
            <Link
              key={dep.id}
              href={`/items/${dep.id}`}
              className="inline-flex max-w-full items-center rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-foreground hover:bg-accent"
              title={dep.title}
            >
              <span className="truncate">{dep.title}</span>
            </Link>
          ))}
          {extra > 0 && (
            <span className="text-xs text-muted-foreground">
              +{extra} more
            </span>
          )}
        </div>
      )}

      {inProgressWarning && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <TriangleAlert className="size-3.5" />
          Has unfinished dependencies
        </p>
      )}

      <ItemActions
        item={item}
        onStatus={onStatus}
        onEdit={onEdit}
        onMove={onMove}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />
    </div>
  );
}
