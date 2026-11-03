import { Suspense } from "react";
import { ListSkeleton } from "@/components/layout/skeletons";
import { IdeasView } from "@/components/ideas/ideas-view";
import { listItems, projectOptionsFrom } from "@/lib/db/queries";

export const metadata = { title: "Ideas" };

async function IdeasData() {
  const items = await listItems();
  return <IdeasView items={items} projects={projectOptionsFrom(items)} />;
}

export default function IdeasPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <IdeasData />
    </Suspense>
  );
}
