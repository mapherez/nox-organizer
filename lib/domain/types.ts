/**
 * Shared domain types.
 *
 * These are plain, serializable types shared between Server Components,
 * Server Actions and Client Components. They intentionally do not import
 * from the generated Prisma client so they stay safe to use on the client.
 */

export type Kind = "project" | "idea";

export type Status = "backlog" | "queued" | "in_progress" | "done" | "dropped";

export const KINDS: Kind[] = ["project", "idea"];
export const STATUSES: Status[] = ["backlog", "queued", "in_progress", "done", "dropped"];

/** A dependency reference (a prerequisite or a dependent item). */
export interface DependencyRef {
  id: string;
  kind: Kind;
  title: string;
  status: Status;
}

/** A short reference to an idea linked to a project. */
export interface LinkedIdeaRef {
  id: string;
  title: string;
  status: Status;
}

/** A fully serializable view of an item, safe to pass to client components. */
export interface ItemView {
  id: string;
  kind: Kind;
  title: string;
  description: string | null;
  status: Status;
  position: number | null;
  linkedProjectId: string | null;
  linkedProjectTitle: string | null;
  createdAt: string;
  updatedAt: string;
  /** Items this item is blocked by (its prerequisites). */
  blockedBy: DependencyRef[];
  /** Items that are blocked by this item (its dependents). */
  blocks: DependencyRef[];
  /** Ideas linked to this project (projects only). */
  linkedIdeas: LinkedIdeaRef[];
}

/** A minimal item reference used by pickers (e.g. the dependency picker). */
export interface ItemOption {
  id: string;
  kind: Kind;
  title: string;
  status: Status;
}

/** Result shape returned by server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
