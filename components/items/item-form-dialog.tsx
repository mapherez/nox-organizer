"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createItem, updateItem } from "@/lib/actions/items";
import { itemFormSchema, type ItemFormValues } from "@/lib/domain/schemas";
import type { ItemOption, ItemView } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ItemFormMode = "create-project" | "create-idea" | "edit";

const NO_PROJECT = "none";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ItemFormMode;
  /** Required for edit mode. */
  initial?: ItemView;
  /** Project options for the idea link select. */
  projects: ItemOption[];
}

/**
 * Create/edit form (spec §17). Shared by the "New" menus and the item
 * detail view. Ideas can optionally be linked to one project.
 */
export function ItemFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  projects,
}: ItemFormDialogProps) {
  const isIdeaForm = mode === "create-idea" || (mode === "edit" && initial?.kind === "idea");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { title: "", description: "", linkedProjectId: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        linkedProjectId: initial?.linkedProjectId ?? "",
      });
    }
  }, [open, initial, reset, mode]);

  const title =
    mode === "edit"
      ? "Edit item"
      : mode === "create-project"
        ? "New Project"
        : "New Idea";

  async function onSubmit(values: ItemFormValues) {
    const result =
      mode === "edit" && initial
        ? await updateItem(initial.id, values)
        : await createItem(
            mode === "create-project" ? "project" : "idea",
            values,
          );

    if (result.ok) {
      toast.success(
        mode === "edit"
          ? "Updated"
          : mode === "create-project"
            ? "Project created"
            : "Idea created",
      );
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the details of this item."
              : mode === "create-project"
                ? "Projects start in progress."
                : "Ideas start in the backlog. You can link an idea to a project."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="item-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="item-title"
              placeholder="e.g. Media Dashboard"
              maxLength={120}
              {...register("title")}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="item-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="item-description"
              placeholder="Optional details…"
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {isIdeaForm && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Link to project</label>
              <Select
                value={
                  initial?.linkedProjectId ??
                  (watch("linkedProjectId") || NO_PROJECT)
                }
                onValueChange={(value) => setValue("linkedProjectId", value === NO_PROJECT ? "" : value)}
              >
                <SelectTrigger className="w-full" aria-label="Link to project">
                  <SelectValue placeholder="No project" />
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
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
