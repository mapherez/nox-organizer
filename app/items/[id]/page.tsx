import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ItemDetailView } from "@/components/items/item-detail-view";
import { ListSkeleton } from "@/components/layout/skeletons";
import { getItemView, listItems, projectOptionsFrom } from "@/lib/db/queries";

export const metadata = { title: "Item" };

async function ItemData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, items] = await Promise.all([getItemView(id), listItems()]);
  if (!item) notFound();
  return (
    <ItemDetailView
      item={item}
      items={items}
      projects={projectOptionsFrom(items)}
    />
  );
}

export default function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ItemData params={params} />
    </Suspense>
  );
}
