import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { RemoveItem, DeletePlaylist } from "./Controls";
import { formatCount } from "@/lib/format";

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, p] = await Promise.all([
    currentUser(),
    db.playlist.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true } },
        items: {
          where: { video: { status: "READY" } },
          include: { video: true },
          orderBy: { addedAt: "asc" },
        },
      },
    }),
  ]);
  if (!p) notFound();
  const isOwner = me?.id === p.ownerId;
  const cdn = process.env.NEXT_PUBLIC_CDN_URL;
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <p><Link href={isOwner ? "/playlists" : "/"}>← Back</Link></p>
      <h1>{p.name}</h1>
      <p style={{ opacity: 0.7 }}>By {p.owner.name} · {p.items.length} videos</p>
      {isOwner && <DeletePlaylist id={p.id} />}
      {p.items.map(({ video: v }) => (
        <div key={v.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #8884" }}>
          <Link href={`/watch/${v.id}`} style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, textDecoration: "none", color: "inherit" }}>
            <img src={`${cdn}/${v.thumbPath}`} alt="" style={{ width: 160, aspectRatio: "16/9", objectFit: "cover", background: "#222", borderRadius: 6 }} />
            <div>
              <div style={{ fontWeight: 600 }}>{v.title}</div>
              <div className="meta">{formatCount(v.views)} views</div>
            </div>
          </Link>
          {isOwner && <RemoveItem playlistId={p.id} videoId={v.id} />}
        </div>
      ))}
      {!p.items.length && <p>This playlist is empty.</p>}
    </main>
  );
}
