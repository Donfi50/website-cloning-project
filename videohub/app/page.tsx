import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";
import { formatCount } from "@/lib/format";

const SORTS = { new: "Newest", views: "Most viewed", likes: "Most liked" } as const;
type Sort = keyof typeof SORTS;
const PAGE_SIZE = 24;

type Params = { q?: string; tag?: string; sort?: string; page?: string };

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { q, tag } = sp;
  const sort: Sort = (["new", "views", "likes"] as const).find(s => s === sp.sort) ?? "new";

  // Builds a link that keeps the current search, tag and sort unless overridden.
  // The page is never carried over, so changing a filter starts again at page 1.
  const href = (over: { tag?: string | null; sort?: string | null; page?: number | null }) => {
    const p = new URLSearchParams();
    const next = { q, tag, sort: sort === "new" ? undefined : sort, ...over };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  const where: Prisma.VideoWhereInput = {
    status: "READY",
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };
  const orderBy: Prisma.VideoOrderByWithRelationInput[] =
    sort === "views" ? [{ views: "desc" }, { createdAt: "desc" }]
    : sort === "likes" ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
    : [{ createdAt: "desc" }];

  const total = await db.video.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(sp.page ?? "1", 10) || 1), totalPages);

  const [videos, popular] = await Promise.all([
    db.video.findMany({
      where,
      include: { _count: { select: { likes: true } } },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.$queryRaw<{ tag: string; n: bigint }[]>`
      SELECT t AS tag, count(*) AS n
      FROM "Video", unnest(tags) AS t
      WHERE status = 'READY'::"VideoStatus"
      GROUP BY t ORDER BY n DESC, t LIMIT 15`,
  ]);
  const cdn = process.env.NEXT_PUBLIC_CDN_URL;
  const pageLink = (n: number) => href({ page: n === 1 ? null : n });

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <header className="topbar">
        <Link href="/" className="logo">{SITE.name}</Link>
        <form action="/" className="search" role="search">
          {tag && <input type="hidden" name="tag" value={tag} />}
          {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
          <input name="q" defaultValue={q} placeholder="Search videos" aria-label="Search videos" />
        </form>
        <nav className="nav" aria-label="Account">
          <Link href="/upload">Upload</Link>
          <Link href="/studio">My videos</Link>
          <Link href="/playlists">Playlists</Link>
          <Link href="/account">Account</Link>
        </nav>
      </header>

      <nav className="tabs" aria-label="Sort">
        {(Object.keys(SORTS) as Sort[]).map(s => (
          <Link key={s} href={href({ sort: s === "new" ? null : s })} aria-current={s === sort ? "page" : undefined}>
            {SORTS[s]}
          </Link>
        ))}
      </nav>

      <nav className="chips" aria-label="Tags">
        {tag && <Link href={href({ tag: null })} className="chip active">✕ {tag}</Link>}
        {popular.filter(p => p.tag !== tag).map(p => (
          <Link key={p.tag} href={href({ tag: p.tag })} className="chip">
            #{p.tag} <small>{Number(p.n)}</small>
          </Link>
        ))}
      </nav>

      <div className="grid">
        {videos.map(v => (
          <Link key={v.id} href={`/watch/${v.id}`} className="card">
            {v.thumbPath ? <img className="thumb" src={`${cdn}/${v.thumbPath}`} alt="" /> : <div className="thumb" />}
            <div className="card-title">{v.title}</div>
            <div className="meta">{formatCount(v.views)} views · ♥ {formatCount(v._count.likes)}</div>
          </Link>
        ))}
      </div>
      {!videos.length && <p className="empty">No videos found.</p>}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="pagination">
          {page > 1 ? <Link href={pageLink(page - 1)}>← Previous</Link> : <span className="off">← Previous</span>}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages ? <Link href={pageLink(page + 1)}>Next →</Link> : <span className="off">Next →</span>}
        </nav>
      )}
    </main>
  );
}
