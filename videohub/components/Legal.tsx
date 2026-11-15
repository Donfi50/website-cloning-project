import { SITE } from "@/lib/site";

export default function Legal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", lineHeight: 1.6 }}>
      <h1>{title}</h1>
      <p style={{ opacity: 0.7 }}>Last updated: {SITE.updated}</p>
      {children}
    </main>
  );
}
