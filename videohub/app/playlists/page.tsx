import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import CreateForm from "./CreateForm";

export default async function Playlists() {
  const me = await currentUser();
  if (!me) redirect("/signin");
  const lists = await db.playlist.findMany({
    where: { ownerId: me.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <h1>My playlists</h1>
      <p><Link href="/">Back to browsing</Link></p>
      <CreateForm />
      {lists.map(p => (
        <div key={p.id} style={{ borderBottom: "1px solid #8884", padding: "10px 0" }}>
          <Link href={`/playlists/${p.id}`}><b>{p.name}</b></Link>
          <span style={{ opacity: 0.7 }}> · {p._count.items} videos</span>
        </div>
      ))}
      {!lists.length && <p>No playlists yet.</p>}
    </main>
  );
}
