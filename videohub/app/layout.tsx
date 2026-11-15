import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: `Watch and share videos on ${SITE.name}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/copyright">Copyright and takedowns</Link>
          <a href={`mailto:${SITE.email}`}>Contact</a>
        </footer>
      </body>
    </html>
  );
}
