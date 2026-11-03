import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-lg font-semibold">Item not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This item doesn&apos;t exist or may have been removed.
      </p>
      <Button asChild variant="outline">
        <Link href="/queue">Back to Work Queue</Link>
      </Button>
    </div>
  );
}
