import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import AppealForm from "./AppealForm";

export default async function AppealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect("/signin");
  const v = await db.video.findUnique({ where: { id } });
  if (!v || v.ownerId !== me.id || v.status !== "REMOVED" || !v.removedAt) notFound();
  const existing = await db.appeal.findFirst({ where: { videoId: v.id, createdAt: { gte: v.removedAt } } });
  if (existing) redirect("/studio");
  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 16, lineHeight: 1.5 }}>
      <h1>Appeal a removal</h1>
      <p><b>{v.title}</b><br />Removed for: {v.removedReason}</p>
      <p>Tell the moderators why you think this was a mistake. You can appeal each removal once.</p>
      <AppealForm videoId={v.id} />
    </main>
  );
}
