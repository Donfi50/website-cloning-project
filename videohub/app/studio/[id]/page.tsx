import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import EditForm from "./EditForm";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect("/signin");
  const v = await db.video.findUnique({ where: { id } });
  if (!v || v.ownerId !== me.id || v.status === "REMOVED") notFound();
  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 16 }}>
      <h1>Edit video</h1>
      <EditForm id={v.id} initial={{ title: v.title, description: v.description, tags: v.tags.join(", ") }} />
    </main>
  );
}
