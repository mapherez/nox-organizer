import { Suspense } from "react";
import { ListSkeleton } from "@/components/layout/skeletons";
import { QueueView } from "@/components/queue/queue-view";
import { listItems, projectOptionsFrom } from "@/lib/db/queries";

export const metadata = { title: "Work Queue" };

async function QueueData() {
  const items = await listItems();
  return <QueueView items={items} projects={projectOptionsFrom(items)} />;
}

export default function QueuePage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <QueueData />
    </Suspense>
  );
}
