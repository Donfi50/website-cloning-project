import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import Player from "./Player";
import { ReportButton, CommentForm, LikeButton } from "./Actions";
import { currentUser } from "@/lib/authz";
import SaveToPlaylist from "./SaveToPlaylist";
import { formatCount } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = await db.video.findUnique({ where: { id }, select: { title: true, description: true, status: true } });
  if (!v || v.status !== "READY") return {};
  return { title: v.title, description: v.description.slice(0, 160) || undefined };
}

export default async function Watch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    include: { _count: { select: { likes: true } }, comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!video || video.status !== "READY") notFound();
  const me = await currentUser();
  const liked = me ? !!(await db.like.findUnique({ where: { userId_videoId: { userId: me.id, videoId: id } } })) : false;
  const mine = me
    ? (await db.playlist.findMany({
        where: { ownerId: me.id },
        orderBy: { createdAt: "desc" },
        include: { items: { where: { videoId: id }, select: { videoId: true } } },
      })).map(p => ({ id: p.id, name: p.name, has: p.items.length > 0 }))
    : [];
  const src = `${process.env.NEXT_PUBLIC_CDN_URL}/${video.hlsPath}`;
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <Player src={src} id={video.id} />
      <h1>{video.title}</h1>
      <p>{formatCount(video.views)} views · <LikeButton videoId={video.id} initialLiked={liked} initialCount={video._count.likes} /> · <ReportButton videoId={video.id} /></p>
      {video.tags.length > 0 && (
        <p>{video.tags.map(t => <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} style={{ marginRight: 8 }}>#{t}</Link>)}</p>
      )}
      <SaveToPlaylist videoId={video.id} signedIn={!!me} initial={mine} />
      {video.description && <p style={{ whiteSpace: "pre-wrap" }}>{video.description}</p>}
      <h2>Comments</h2>
      <CommentForm videoId={video.id} />
      {video.comments.map(c => (
        <p key={c.id}><b>{c.user.name}</b> {c.body}</p>
      ))}
    </main>
  );
}
