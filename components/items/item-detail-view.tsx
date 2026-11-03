"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Link2,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDependency,
  changeStatus,
  convertToProject,
  removeDependency,
  updateItem,
} from "@/lib/actions/items";
import { unsatisfiedPrerequisites } from "@/lib/domain/queue";
import { CANNOT_START_ERROR, isSatisfied, STATUS_LABELS } from "@/lib/domain/status";
import type { ItemOption, ItemView, Status } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemActions } from "@/components/items/item-actions";
import { ItemFormDialog } from "@/components/items/item-form-dialog";
import { KindBadge, StatusBadge } from "@/components/items/badges";

const NO_PROJECT = "none";

interface ItemDetailViewProps {
  item: ItemView;
  /** All items, used for pickers. */
  items: ItemView[];
  /** Project options for the idea link select. */
  projects: ItemOption[];
}

/** Shared item detail view (spec §16) for projects and ideas. */
export function ItemDetailView({ item, items, projects }: ItemDetailViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [depPickerOpen, setDepPickerOpen] = React.useState(false);
  const [depPickerError, setDepPickerError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState(false);

  const isIdea = item.kind === "idea";
  const canConvert =
    isIdea &&
    item.linkedProjectId === null &&
    ["backlog", "queued", "in_progress"].includes(item.status);

  const pickerOptions = React.useMemo(
    () =>
      items
        .filter((candidate) => candidate.id !== item.id)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [items, item.id],
  );

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/queue");
  }

  function handleStatus(to: Status) {
    if (to === "in_progress" && item.blockedBy.some((d) => !isSatisfied(d.status))) {
      toast.error(CANNOT_START_ERROR);
      return;
    }
    void changeStatus(item.id, to).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }

  async function handleLinkProject(projectId: string) {
    const result = await updateItem(item.id, {
      title: item.title,
      description: item.description ?? "",
      linkedProjectId: projectId,
    });
    if (result.ok) toast.success("Updated");
    else toast.error(result.error);
  }

  async function handleConvert() {
    const result = await convertToProject(item.id);
    if (result.ok) toast.success("Converted to project");
    else toast.error(result.error);
  }

  async function handleAddDependency(prerequisiteId: string) {
    setPendingAction(true);
    const result = await addDependency(item.id, prerequisiteId);
    setPendingAction(false);
    if (result.ok) {
      setDepPickerOpen(false);
      setDepPickerError(null);
      toast.success("Dependency added");
    } else {
      setDepPickerError(result.error);
    }
  }

  async function handleRemoveDependency(prerequisiteId: string) {
    const result = await removeDependency(item.id, prerequisiteId);
    if (result.ok) toast.success("Dependency removed");
    else toast.error(result.error);
  }

  const unfinished = item.status === "in_progress" ? unsatisfiedPrerequisites(item) : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={handleBack}
          className="-ml-1 mt-0.5 shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-xl font-semibold">
              {item.title}
            </h1>
            <KindBadge kind={item.kind} />
            <StatusBadge status={item.status} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <ItemActions
          item={item}
          onStatus={(_i, to) => handleStatus(to)}
          onEdit={() => setEditOpen(true)}
        />
        {canConvert && (
          <Button variant="outline" onClick={handleConvert}>
            Convert to project
          </Button>
        )}
      </div>

      {unfinished.length > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <TriangleAlert className="size-4 shrink-0" />
          In progress with unfinished dependencies: {unfinished.map((d) => d.title).join(", ")}
        </p>
      )}

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Description
        </h2>
        {item.description ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {item.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No description yet.</p>
        )}
      </section>

      {isIdea ? (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Linked project
          </h2>
          <Select
            value={item.linkedProjectId ?? NO_PROJECT}
            onValueChange={handleLinkProject}
          >
            <SelectTrigger className="w-full sm:max-w-xs" aria-label="Linked project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>Standalone idea</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {item.linkedProjectId && (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mt-1 text-muted-foreground"
              onClick={() => handleLinkProject("")}
            >
              <Unlink className="size-3.5" />
              Unlink project
            </Button>
          )}
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Linked ideas
          </h2>
          {item.linkedIdeas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked ideas yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {item.linkedIdeas.map((idea) => (
                <li key={idea.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/items/${idea.id}`}
                    className="min-w-0 truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    title={idea.title}
                  >
                    {idea.title}
                  </Link>
                  <StatusBadge status={idea.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Dependencies
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDepPickerError(null);
              setDepPickerOpen(true);
            }}
          >
            Add dependency
          </Button>
        </div>

        {item.blockedBy.length === 0 && item.blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dependencies.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {item.blockedBy.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Blocked by
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {item.blockedBy.map((dep) => (
                    <li
                      key={dep.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2"
                    >
                      <Link
                        href={`/items/${dep.id}`}
                        className="min-w-0 truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        title={dep.title}
                      >
                        {dep.title}
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={dep.status} />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove dependency on ${dep.title}`}
                          onClick={() => handleRemoveDependency(dep.id)}
                        >
                          <Unlink className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {item.blocks.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Blocks
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {item.blocks.map((dep) => (
                    <li
                      key={dep.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2"
                    >
                      <Link
                        href={`/items/${dep.id}`}
                        className="min-w-0 truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        title={dep.title}
                      >
                        {dep.title}
                      </Link>
                      <StatusBadge status={dep.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Edit */}
      <ItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={item}
        projects={projects}
      />

      {/* Add dependency picker */}
      <Dialog
        open={depPickerOpen}
        onOpenChange={(open) => {
          setDepPickerOpen(open);
          if (!open) setDepPickerError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="size-4" />
              Add dependency
            </DialogTitle>
            <DialogDescription>
              “{item.title}” will be blocked by the selected item until it is
              done or dropped.
            </DialogDescription>
          </DialogHeader>

          {pickerOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              There are no other items to depend on.
            </p>
          ) : (
            <AddDependencySelect
              options={pickerOptions}
              error={depPickerError}
              pending={pendingAction}
              onSelect={handleAddDependency}
            />
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDepPickerOpen(false)}
              disabled={pendingAction}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The dependency picker (spec §16.7): picking an item immediately creates
 * the dependency. Errors (e.g. a cycle) are shown inline and the dialog
 * stays open. The select is uncontrolled — the dialog content unmounts on
 * close, so it resets for the next open.
 */
function AddDependencySelect({
  options,
  error,
  pending,
  onSelect,
}: {
  options: ItemView[];
  error: string | null;
  pending: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Select
        onValueChange={(value) => onSelect(value)}
        disabled={pending}
      >
        <SelectTrigger className="w-full" aria-label="Item to depend on">
          <SelectValue placeholder="Choose an item…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.title}
              <span className="ml-2 text-xs text-muted-foreground">
                {option.kind === "project" ? "Project" : "Idea"} ·{" "}
                {STATUS_LABELS[option.status]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
