import Link from "next/link";

export default function AdminNav() {
  return (
    <nav style={{ display: "flex", gap: 16, marginBottom: 16 }}>
      <Link href="/admin">Reports</Link>
      <Link href="/admin/users">Users</Link>
      <Link href="/admin/videos">Videos</Link>
      <Link href="/admin/appeals">Appeals</Link>
      <Link href="/admin/audit">Audit log</Link>
      <Link href="/" style={{ marginLeft: "auto" }}>Back to site</Link>
    </nav>
  );
}
