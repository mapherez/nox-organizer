"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { Status, ItemView } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

/**
 * Contextual status actions (spec §13.7). The same set is used on queue
 * cards, list rows and the item detail view.
 *
 * - Drop is always visually secondary (destructive outline).
 * - Move up / down are only available for queued items.
 */
interface ItemActionsProps {
  item: ItemView;
  onStatus: (item: ItemView, to: Status) => void;
  onEdit: (item: ItemView) => void;
  onMove?: (item: ItemView, direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export function ItemActions({
  item,
  onStatus,
  onEdit,
  onMove,
  canMoveUp,
  canMoveDown,
  className,
}: ItemActionsProps) {
  const moveButtons =
    item.status === "queued" && onMove ? (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Move up"
          disabled={!canMoveUp}
          onClick={() => onMove(item, "up")}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Move down"
          disabled={!canMoveDown}
          onClick={() => onMove(item, "down")}
        >
          <ChevronDown className="size-4" />
        </Button>
      </>
    ) : null;

  const dropButton = (
    <Button
      variant="outline"
      className="text-destructive hover:text-destructive dark:border-destructive/40 dark:hover:bg-destructive/10"
      onClick={() => onStatus(item, "dropped")}
    >
      Drop
    </Button>
  );

  const editButton = (
    <Button variant="secondary" onClick={() => onEdit(item)}>
      Edit
    </Button>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {item.status === "backlog" && (
        <>
          <Button onClick={() => onStatus(item, "queued")}>Add to queue</Button>
          {editButton}
          {dropButton}
        </>
      )}

      {item.status === "queued" && (
        <>
          <Button onClick={() => onStatus(item, "in_progress")}>Start</Button>
          <Button
            variant="secondary"
            onClick={() => onStatus(item, "backlog")}
          >
            Remove from queue
          </Button>
          {moveButtons}
          {editButton}
          {dropButton}
        </>
      )}

      {item.status === "in_progress" && (
        <>
          <Button onClick={() => onStatus(item, "done")}>Complete</Button>
          <Button
            variant="secondary"
            onClick={() => onStatus(item, "queued")}
          >
            Return to queue
          </Button>
          {editButton}
          {dropButton}
        </>
      )}

      {item.status === "done" && (
        <>
          <Button onClick={() => onStatus(item, "in_progress")}>Reopen</Button>
          {editButton}
          {dropButton}
        </>
      )}

      {item.status === "dropped" && (
        <>
          <Button onClick={() => onStatus(item, "backlog")}>Restore</Button>
          {editButton}
        </>
      )}
    </div>
  );
}
