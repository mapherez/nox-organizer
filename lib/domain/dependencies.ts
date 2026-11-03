/**
 * Dependency graph helpers (spec §8).
 *
 * Edge semantics: "item depends on prerequisite" — the item is blocked by
 * the prerequisite. In the adjacency map below, keys are items and values
 * are the items they are blocked by.
 */

export type BlockedByMap = Map<string, string[]>;

/**
 * Build the blocked-by adjacency map from a list of dependencies.
 */
export function buildBlockedByMap(
  deps: { itemId: string; prerequisiteId: string }[],
): BlockedByMap {
  const map: BlockedByMap = new Map();
  for (const dep of deps) {
    const list = map.get(dep.itemId);
    if (list) {
      list.push(dep.prerequisiteId);
    } else {
      map.set(dep.itemId, [dep.prerequisiteId]);
    }
  }
  return map;
}

/**
 * Would adding "itemId is blocked by prerequisiteId" create a cycle?
 *
 * A cycle exists when the prerequisite is already (transitively) blocked by
 * the item — i.e. there is a blocked-by path from the prerequisite back to
 * the item.
 */
export function wouldCreateCycle(
  itemId: string,
  prerequisiteId: string,
  blockedBy: BlockedByMap,
): boolean {
  if (itemId === prerequisiteId) return true;

  const stack = [prerequisiteId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === itemId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const next = blockedBy.get(current);
    if (next) {
      for (const id of next) {
        if (!visited.has(id)) stack.push(id);
      }
    }
  }
  return false;
}
