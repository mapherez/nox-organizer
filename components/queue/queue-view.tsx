"use client";

import * as React from "react";
import { toast } from "sonner";
import { changeStatus, reorderQueued } from "@/lib/actions/items";
import {
  buildQueueModel,
  orderedQueued,
} from "@/lib/domain/queue";
import { CANNOT_START_ERROR, isSatisfied } from "@/lib/domain/status";
import type { ItemOption, ItemView, Status } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { ItemFormDialog, type ItemFormMode } from "@/components/items/item-form-dialog";
import { QueueCard } from "./queue-card";

interface QueueViewProps {
  items: ItemView[];
  projects: ItemOption[];
}

type QueueUpdate =
  | { type: "status"; id: string; status: Status }
  | { type: "move"; id: string; direction: "up" | "down" };

/** Apply an optimistic queue update to a list of items. */
function queueReducer(current: ItemView[], update: QueueUpdate): ItemView[] {
  if (update.type === "status") {
    return current.map((item) =>
      item.id === update.id ? { ...item, status: update.status } : item,
    );
  }
  if (update.type === "move") {
    const queued = orderedQueued(current);
    const index = queued.findIndex((item) => item.id === update.id);
    const target = update.direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= queued.length) return current;
    const list = [...queued];
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    const positions = new Map(list.map((entry, i) => [entry.id, i + 1]));
    return current.map((entry) =>
      entry.status === "queued" && positions.has(entry.id)
        ? { ...entry, position: positions.get(entry.id)! }
        : entry,
    );
  }
  return current;
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

/**
 * Work Queue view (spec §13).
 *
 * Sections: In progress, Ready, Blocked. The first Ready item is the
 * "next up" item. Queued items can be reordered with move up/down controls.
 *
 * Optimistic updates use `useOptimistic`: the displayed list updates
 * immediately, and when the server action resolves (which re-renders the
 * page via refresh), the display reconciles back to the canonical server
 * data — reverting automatically if the action fails.
 */
export function QueueView({ items, projects }: QueueViewProps) {
  const [optimisticItems, applyUpdate] = React.useOptimistic(items, queueReducer);
  const [, startTransition] = React.useTransition();
  const [formMode, setFormMode] = React.useState<ItemFormMode | null>(null);
  const [editItem, setEditItem] = React.useState<ItemView | null>(null);

  const model = React.useMemo(() => buildQueueModel(optimisticItems), [optimisticItems]);
  const queuePosition = React.useMemo(
    () => new Map(orderedQueued(optimisticItems).map((item, index) => [item.id, index])),
    [optimisticItems],
  );

  const queueEmpty =
    model.inProgress.length === 0 &&
    model.ready.length === 0 &&
    model.blocked.length === 0;

  function runTransition(update: QueueUpdate, action: Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      applyUpdate(update);
      const result = await action;
      if (!result.ok) toast.error(result.error);
    });
  }

  function handleStatus(item: ItemView, to: Status) {
    // Client-side guard for starting a blocked item (spec §27, AC6).
    if (to === "in_progress" && item.blockedBy.some((d) => !isSatisfied(d.status))) {
      toast.error(CANNOT_START_ERROR);
      return;
    }
    runTransition(
      { type: "status", id: item.id, status: to },
      changeStatus(item.id, to),
    );
  }

  function handleMove(item: ItemView, direction: "up" | "down") {
    runTransition(
      { type: "move", id: item.id, direction },
      reorderQueued(item.id, direction),
    );
  }

  function handleEdit(item: ItemView) {
    setEditItem(item);
  }

  const moveProps = (item: ItemView) => {
    const index = queuePosition.get(item.id);
    const lastIndex = queuePosition.size - 1;
    return {
      canMoveUp: index !== undefined && index > 0,
      canMoveDown: index !== undefined && index < lastIndex,
    };
  };

  if (queueEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <h2 className="text-lg font-semibold">Your queue is empty.</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add a project or idea and put it in the queue.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button onClick={() => setFormMode("create-project")}>New Project</Button>
          <Button variant="outline" onClick={() => setFormMode("create-idea")}>
            New Idea
          </Button>
        </div>
        <ItemFormDialog
          open={formMode !== null}
          onOpenChange={(open) => !open && setFormMode(null)}
          mode={formMode ?? "create-project"}
          projects={projects}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {model.inProgress.length > 0 && (
        <section aria-label="In progress">
          <SectionHeader title="In progress" count={model.inProgress.length} />
          <div className="flex flex-col gap-3">
            {model.inProgress.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                nextUp={false}
                canMoveUp={false}
                canMoveDown={false}
                onStatus={handleStatus}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Ready">
        <SectionHeader title="Ready" count={model.ready.length} />
        {model.ready.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No ready items. Finish dependencies or add more to the queue.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {model.ready.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                nextUp={item.id === model.nextUpId}
                onStatus={handleStatus}
                onEdit={handleEdit}
                onMove={handleMove}
                {...moveProps(item)}
              />
            ))}
          </div>
        )}
      </section>

      {model.blocked.length > 0 && (
        <section aria-label="Blocked">
          <SectionHeader title="Blocked" count={model.blocked.length} />
          <div className="flex flex-col gap-3">
            {model.blocked.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                nextUp={false}
                onStatus={handleStatus}
                onEdit={handleEdit}
                onMove={handleMove}
                {...moveProps(item)}
              />
            ))}
          </div>
        </section>
      )}

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
