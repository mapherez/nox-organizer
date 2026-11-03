import { Suspense } from "react";
import { ListSkeleton } from "@/components/layout/skeletons";
import { ProjectsView } from "@/components/projects/projects-view";
import { listItems, projectOptionsFrom } from "@/lib/db/queries";

export const metadata = { title: "Projects" };

async function ProjectsData() {
  const items = await listItems();
  return <ProjectsView items={items} projects={projectOptionsFrom(items)} />;
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProjectsData />
    </Suspense>
  );
}
