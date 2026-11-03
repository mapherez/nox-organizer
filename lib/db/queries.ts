import { getPrisma } from "./index";
import type {
  DependencyRef,
  ItemOption,
  ItemView,
  Kind,
  Status,
} from "@/lib/domain/types";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * The single query shape used by the views. One round trip brings back
 * everything the UI needs: items, their prerequisites/dependents,
 * linked project, and linked ideas.
 */
const itemSelect = {
  id: true,
  kind: true,
  title: true,
  description: true,
  status: true,
  position: true,
  linkedProjectId: true,
  createdAt: true,
  updatedAt: true,
  linkedProject: { select: { id: true, title: true } },
  dependsOn: {
    include: {
      prerequisite: { select: { id: true, kind: true, title: true, status: true } },
    },
  },
  blocks: {
    include: {
      item: { select: { id: true, kind: true, title: true, status: true } },
    },
  },
  linkedIdeas: { select: { id: true, title: true, status: true, kind: true } },
} satisfies Prisma.ItemSelect;

type ItemRecord = Prisma.ItemGetPayload<{ select: typeof itemSelect }>;

function toDependencyRef(input: {
  id: string;
  kind: Kind;
  title: string;
  status: Status;
}): DependencyRef {
  return { id: input.id, kind: input.kind, title: input.title, status: input.status };
}

export function toItemView(record: ItemRecord): ItemView {
  return {
    id: record.id,
    kind: record.kind,
    title: record.title,
    description: record.description,
    status: record.status,
    position: record.position,
    linkedProjectId: record.linkedProjectId,
    linkedProjectTitle: record.linkedProject?.title ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    blockedBy: record.dependsOn.map((d) => toDependencyRef(d.prerequisite)),
    blocks: record.blocks.map((d) => toDependencyRef(d.item)),
    linkedIdeas: record.linkedIdeas
      .filter((idea) => idea.kind === "idea")
      .map((idea) => ({ id: idea.id, title: idea.title, status: idea.status })),
  };
}

export async function listItems(): Promise<ItemView[]> {
  const prisma = await getPrisma();
  const records = await prisma.item.findMany({ select: itemSelect });
  return records.map(toItemView);
}

export async function getItemView(id: string): Promise<ItemView | null> {
  const prisma = await getPrisma();
  const record = await prisma.item.findUnique({
    where: { id },
    select: itemSelect,
  });
  return record ? toItemView(record) : null;
}

/** Derive project options (for link selects) from an already-loaded list. */
export function projectOptionsFrom(items: ItemView[]): ItemOption[] {
  return items
    .filter((item) => item.kind === "project")
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      status: item.status,
    }));
}
