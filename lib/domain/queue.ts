import { isSatisfied } from "./status";
import type { ItemView, Status } from "./types";

/**
 * Work queue computation (spec §6.3, §6.4, §13).
 *
 * A `queued` item is Ready when all of its prerequisites are satisfied and
 * Blocked otherwise. The queue is ordered by `position` across both groups.
 */

export interface QueueModel {
  /** All in-progress items, oldest activity first. */
  inProgress: ItemView[];
  /** Queued items with all dependencies satisfied, in position order. */
  ready: ItemView[];
  /** Queued items with at least one unsatisfied dependency, in position order. */
  blocked: ItemView[];
  /** The first Ready item in position order, or null. */
  nextUpId: string | null;
}

export function isReady(item: ItemView): boolean {
  return item.status === "queued" && item.blockedBy.every((d) => isSatisfied(d.status));
}

export function isBlocked(item: ItemView): boolean {
  return item.status === "queued" && item.blockedBy.some((d) => !isSatisfied(d.status));
}

/** Prerequisites that are still unfinished (what the item is waiting on). */
export function unsatisfiedPrerequisites(item: ItemView): ItemView["blockedBy"] {
  return item.blockedBy.filter((d) => !isSatisfied(d.status));
}

/** In-progress items may still have unfinished dependencies; surface a warning. */
export function hasUnfinishedDependencies(item: ItemView): boolean {
  return item.blockedBy.some((d) => !isSatisfied(d.status));
}

export function buildQueueModel(items: ItemView[]): QueueModel {
  const inProgress = items
    .filter((i) => i.status === "in_progress")
    .sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

  const queued = items
    .filter((i) => i.status === "queued")
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const ready = queued.filter(isReady);
  const blocked = queued.filter(isBlocked);

  const nextUp = ready[0] ?? null;

  return { inProgress, ready, blocked, nextUpId: nextUp ? nextUp.id : null };
}

/** Full ordered queue (ready + blocked interleaved by position). */
export function orderedQueued(items: ItemView[]): ItemView[] {
  return items
    .filter((i) => i.status === "queued")
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/* -------------------------------------------------------------------------- */
/* Queue position arithmetic (spec §24)                                        */
/* -------------------------------------------------------------------------- */

/** Positions are floating point numbers; new positions sit between neighbors. */
export const POSITION_START = 1;
export const POSITION_STEP = 1;

/** Minimum usable gap between two positions before we renormalize. */
const MIN_GAP = 1e-6;

/**
 * Compute the position of an item moving to sit between `prev` and `next`
 * (either may be null at the ends of the queue).
 *
 * Returns `null` when the gap is too small and the caller should renormalize
 * the whole queue instead.
 */
export function positionBetween(
  prev: number | null,
  next: number | null,
): number | null {
  if (prev === null && next === null) return POSITION_START;
  if (prev === null) return next! / 2;
  if (next === null) return prev + POSITION_STEP;
  if (next - prev < MIN_GAP) return null;
  return (prev + next) / 2;
}

/** Assign fresh, evenly spaced positions to an ordered list of queued items. */
export function renormalizedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => POSITION_START + i * POSITION_STEP);
}

/** Append-to-end position for a newly queued item. */
export function nextPosition(positions: number[]): number {
  return positions.length > 0
    ? Math.max(...positions) + POSITION_STEP
    : POSITION_START;
}

export function isQueuedStatus(status: Status): boolean {
  return status === "queued";
}
