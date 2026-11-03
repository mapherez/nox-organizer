import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/domain/status";
import type { Kind, Status } from "@/lib/domain/types";
import { cn } from "cn";

/**
 * Status colors follow the visual direction in spec §28:
 * backlog gray, queued blue, in_progress amber, done green, dropped muted red.
 */
const STATUS_STYLES: Record<Status, string> = {
  backlog:
    "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground",
  queued:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  in_progress:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  done: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  dropped:
    "bg-red-100/70 text-red-700/90 dark:bg-red-500/10 dark:text-red-300/90",
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(STATUS_STYLES[status], "shrink-0", className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function KindBadge({ kind }: { kind: Kind }) {
  return (
    <Badge variant="outline" className="shrink-0">
      {kind === "project" ? "Project" : "Idea"}
    </Badge>
  );
}
