import type { Status } from "./types";

/**
 * Status transition rules (spec §7).
 *
 * | From        | Allowed to                          |
 * |-------------|-------------------------------------|
 * | backlog     | queued, dropped                     |
 * | queued      | in_progress, backlog, dropped       |
 * | in_progress | done, queued, dropped               |
 * | done        | in_progress, dropped                |
 * | dropped     | backlog                             |
 */
export const TRANSITIONS: Record<Status, Status[]> = {
  backlog: ["queued", "dropped"],
  queued: ["in_progress", "backlog", "dropped"],
  in_progress: ["done", "queued", "dropped"],
  done: ["in_progress", "dropped"],
  dropped: ["backlog"],
};

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Human-readable labels for statuses. */
export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  queued: "Queued",
  in_progress: "In progress",
  done: "Done",
  dropped: "Dropped",
};

/** A dependency is satisfied when its prerequisite is done or dropped (§8.4). */
export const SATISFYING_STATUSES: Status[] = ["done", "dropped"];

export function isSatisfied(status: Status): boolean {
  return SATISFYING_STATUSES.includes(status);
}

/**
 * Whether an item can move into `in_progress` right now.
 * Every prerequisite must be satisfied (§7, §8.4).
 */
export function canStart(
  statuses: { prerequisiteStatus: Status }[],
): boolean {
  return statuses.every((d) => isSatisfied(d.prerequisiteStatus));
}

export const CANNOT_START_ERROR =
  "Cannot start: this item is blocked by unfinished dependencies.";
