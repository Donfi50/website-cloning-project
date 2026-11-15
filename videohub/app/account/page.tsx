import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import DeleteAccount from "./DeleteAccount";
import Preferences from "./Preferences";

export default async function Account() {
  const me = await currentUser();
  if (!me) redirect("/signin");
  const [videos, comments, playlists] = await Promise.all([
    db.video.count({ where: { ownerId: me.id, status: { not: "REMOVED" } } }),
    db.comment.count({ where: { userId: me.id } }),
    db.playlist.count({ where: { ownerId: me.id } }),
  ]);
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 16, lineHeight: 1.5 }}>
      <p><Link href="/">← Back</Link></p>
      <h1>Account</h1>
      <p><b>{me.name}</b><br />{me.email}</p>
      <p style={{ opacity: 0.7 }}>{videos} videos · {comments} comments · {playlists} playlists</p>

      <h2>Email notifications</h2>
      <Preferences initialUploadEmails={me.uploadEmails} />

      <h2 style={{ marginTop: 32 }}>Download your data</h2>
      <p>Get a JSON file with your profile, videos, comments, likes and playlists.</p>
      <a href="/api/account/export" download>Download my data</a>

      <h2 style={{ marginTop: 32 }}>Delete your account</h2>
      <p>This permanently deletes your account, your videos (including the video files), your comments, likes and playlists. It can’t be undone.</p>
      <DeleteAccount />
    </main>
  );
}
