"use server";

import { refresh } from "next/cache";
import { getPrisma } from "@/lib/db";
import {
  buildBlockedByMap,
  wouldCreateCycle,
} from "@/lib/domain/dependencies";
import { nextPosition, renormalizedPositions, positionBetween } from "@/lib/domain/queue";
import { canStart, CANNOT_START_ERROR, canTransition } from "@/lib/domain/status";
import { itemFormSchema, type ItemFormValues } from "@/lib/domain/schemas";
import type { ActionResult, ItemOption, Kind } from "@/lib/domain/types";

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

async function validateLinkedProject(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  linkedProjectId: string | null | undefined,
  excludeItemId?: string,
): Promise<string | null> {
  if (!linkedProjectId) return null;
  const project = await prisma.item.findFirst({
    where: { id: linkedProjectId, kind: "project" },
    select: { id: true },
  });
  if (!project || project.id === excludeItemId) {
    return "The selected project is not valid.";
  }
  return null;
}

/** Create a project (starts in_progress) or an idea (starts in backlog). */
export async function createItem(
  kind: Kind,
  form: ItemFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = itemFormSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }
  const { title, description, linkedProjectId } = parsed.data;

  const prisma = await getPrisma();

  if (kind === "project") {
    if (linkedProjectId) {
      return { ok: false, error: "Projects cannot be linked to other projects." };
    }
    const item = await prisma.item.create({
      data: {
        kind: "project",
        title,
        description: description || null,
        status: "in_progress",
      },
    });
    refresh();
    return { ok: true, data: { id: item.id } };
  }

  const linkError = await validateLinkedProject(prisma, linkedProjectId);
  if (linkError) return { ok: false, error: linkError };

  const item = await prisma.item.create({
    data: {
      kind: "idea",
      title,
      description: description || null,
      status: "backlog",
      linkedProjectId: linkedProjectId || null,
    },
  });
  refresh();
  return { ok: true, data: { id: item.id } };
}

/** Edit title/description and (for ideas) the linked project. */
export async function updateItem(
  id: string,
  form: ItemFormValues,
): Promise<ActionResult> {
  const parsed = itemFormSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }
  const { title, description, linkedProjectId } = parsed.data;

  const prisma = await getPrisma();
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Item not found." };

  const data: {
    title: string;
    description: string | null;
    linkedProjectId?: string | null;
  } = {
    title,
    description: description || null,
  };

  if (item.kind === "idea") {
    const linkError = await validateLinkedProject(prisma, linkedProjectId, id);
    if (linkError) return { ok: false, error: linkError };
    data.linkedProjectId = linkedProjectId || null;
  }

  await prisma.item.update({ where: { id }, data });
  refresh();
  return { ok: true, data: undefined };
}

/**
 * Change an item's status with the transition rules from spec §7.
 * Moving into in_progress requires all dependencies to be satisfied.
 */
export async function changeStatus(
  id: string,
  to: "backlog" | "queued" | "in_progress" | "done" | "dropped",
): Promise<ActionResult> {
  const prisma = await getPrisma();
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Item not found." };
  if (!canTransition(item.status, to)) {
    return { ok: false, error: "That status change is not allowed." };
  }

  if (to === "in_progress") {
    const deps = await prisma.dependency.findMany({
      where: { itemId: id },
      select: { prerequisite: { select: { status: true } } },
    });
    if (!canStart(deps.map((d) => ({ prerequisiteStatus: d.prerequisite.status })))) {
      return { ok: false, error: CANNOT_START_ERROR };
    }
  }

  const data: { status: typeof to; position?: number } = { status: to };

  // Entering the queue from the backlog gets a fresh, end-of-queue position.
  if (to === "queued" && item.status === "backlog") {
    const positions = await prisma.item.findMany({
      where: { status: "queued" },
      select: { position: true },
    });
    data.position = nextPosition(
      positions
        .map((p) => p.position)
        .filter((p): p is number => p !== null),
    );
  }

  await prisma.item.update({ where: { id }, data });
  refresh();
  return { ok: true, data: undefined };
}

/** Convert a standalone, unfinished idea into a project (spec §10). */
export async function convertToProject(id: string): Promise<ActionResult> {
  const prisma = await getPrisma();
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Item not found." };

  if (item.kind !== "idea") {
    return { ok: false, error: "Only ideas can be converted to projects." };
  }
  if (item.linkedProjectId) {
    return {
      ok: false,
      error: "This idea is linked to a project, so it cannot be converted.",
    };
  }
  if (!["backlog", "queued", "in_progress"].includes(item.status)) {
    return {
      ok: false,
      error: "Only backlog, queued or in-progress ideas can be converted.",
    };
  }

  await prisma.item.update({ where: { id }, data: { kind: "project" } });
  refresh();
  return { ok: true, data: undefined };
}

/**
 * Reorder a queued item one step up or down in the shared queue order.
 * Uses fractional positions; renormalizes if the gap runs out.
 */
export async function reorderQueued(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult<{ moved: boolean }>> {
  const prisma = await getPrisma();

  const queued = await prisma.item.findMany({
    where: { status: "queued" },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });

  const index = queued.findIndex((item) => item.id === id);
  if (index === -1) return { ok: false, error: "This item is not in the queue." };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= queued.length) {
    return { ok: true, data: { moved: false } };
  }

  const prev =
    direction === "up" ? queued[index - 2]?.position ?? null : queued[index + 1].position;
  const next =
    direction === "up"
      ? queued[index - 1].position
      : queued[index + 2]?.position ?? null;

  const newPosition = positionBetween(prev, next);

  if (newPosition !== null) {
    await prisma.item.update({
      where: { id },
      data: { position: newPosition },
    });
  } else {
    // Gap too small: renormalize the whole queue around the move.
    const moved = [...queued];
    const [item] = moved.splice(index, 1);
    moved.splice(target, 0, item);
    const positions = renormalizedPositions(moved.length);
    await prisma.$transaction(
      moved.map((entry, i) =>
        prisma.item.update({ where: { id: entry.id }, data: { position: positions[i] } }),
      ),
    );
  }

  refresh();
  return { ok: true, data: { moved: true } };
}

/** Minimal project options for the "link to project" select. */
export async function getProjectOptions(): Promise<ItemOption[]> {
  const prisma = await getPrisma();
  const projects = await prisma.item.findMany({
    where: { kind: "project" },
    select: { id: true, kind: true, title: true, status: true },
    orderBy: { title: "asc" },
  });
  return projects.map((p) => ({
    id: p.id,
    kind: p.kind,
    title: p.title,
    status: p.status,
  }));
}

/**
 * Add a dependency: `itemId` is blocked by `prerequisiteId`.
 * Rejects self-dependencies, duplicates and cycles (spec §8.3).
 */
export async function addDependency(
  itemId: string,
  prerequisiteId: string,
): Promise<ActionResult> {
  if (itemId === prerequisiteId) {
    return { ok: false, error: "An item cannot depend on itself." };
  }

  const prisma = await getPrisma();

  const [item, prerequisite] = await prisma.$transaction([
    prisma.item.findUnique({ where: { id: itemId }, select: { id: true } }),
    prisma.item.findUnique({ where: { id: prerequisiteId }, select: { id: true } }),
  ]);
  if (!item || !prerequisite) {
    return { ok: false, error: "One of the selected items does not exist." };
  }

  const existing = await prisma.dependency.findUnique({
    where: { itemId_prerequisiteId: { itemId, prerequisiteId } },
  });
  if (existing) {
    return { ok: false, error: "This dependency already exists." };
  }

  const deps = await prisma.dependency.findMany({
    select: { itemId: true, prerequisiteId: true },
  });
  if (wouldCreateCycle(itemId, prerequisiteId, buildBlockedByMap(deps))) {
    return { ok: false, error: "This dependency would create a cycle." };
  }

  await prisma.dependency.create({
    data: { itemId, prerequisiteId },
  });
  refresh();
  return { ok: true, data: undefined };
}

/** Remove the dependency where `itemId` is blocked by `prerequisiteId`. */
export async function removeDependency(
  itemId: string,
  prerequisiteId: string,
): Promise<ActionResult> {
  const prisma = await getPrisma();
  const result = await prisma.dependency.deleteMany({
    where: { itemId, prerequisiteId },
  });
  if (result.count === 0) {
    return { ok: false, error: "Dependency not found." };
  }
  refresh();
  return { ok: true, data: undefined };
}
