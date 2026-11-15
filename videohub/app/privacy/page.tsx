import type { Metadata } from "next";
import Legal from "@/components/Legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <Legal title="Privacy Policy">
      <p>This explains what {SITE.name} collects, why, and what you can do about it. Operator: [your name or company, and address]. Contact: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name and email address, and your password stored only as a one-way hash.</li>
        <li><b>Things you post:</b> videos, titles, descriptions, tags, comments, likes, playlists and reports you file.</li>
        <li><b>Technical data:</b> your IP address and request details, used to keep the service secure and to limit abuse (rate limiting), and in server logs. To count each viewer’s view of a video only once a day, we also keep a one-way hash of your IP address and browser details for 24 hours.</li>
        <li><b>Cookies:</b> one session cookie that keeps you signed in. We don’t use advertising or analytics cookies. [Update this if you add analytics.]</li>
      </ul>

      <h2>How we use it</h2>
      <p>To run the service: create and secure your account, send verification, password-reset and moderation emails (plus upload status emails, which you can turn off on your account page), show your content, count views and likes, process reports, and prevent abuse. We don’t sell your personal data.</p>

      <h2>Who else handles it</h2>
      <p>We use service providers to operate the site: [hosting provider], [file storage / CDN provider], [email provider], and [rate-limiting provider, if used]. They process data only on our behalf. We may also disclose information when the law requires it or to protect people from harm, including reporting illegal content to the authorities.</p>

      <h2>Public information</h2>
      <p>Your name appears next to your comments and on your playlists. Videos you publish, and their view and like counts, are visible to anyone, including people who aren’t signed in and search engines.</p>

      <h2>How long we keep it</h2>
      <p>Account data is kept while your account exists. When you delete your account, your data is removed from our systems, except for backups, which expire on their normal cycle [confirm for your setup]. When you delete a video, we remove its files from storage and hide it from the site. We keep a minimal record of reported or removed videos so moderation history stays intact. Server logs are kept for [retention period, e.g. 30 days].</p>

      <h2>Your choices and rights</h2>
      <p>You can edit or delete your videos yourself. From your account page you can download a copy of your data and permanently delete your account, which removes your videos, comments, likes and playlists. For anything else, such as correcting data or other requests, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Depending on where you live (for example the EU, UK or California) you may have additional legal rights, and you can complain to your local data protection authority. [Have a lawyer confirm which regimes apply to you.]</p>

      <h2>Children</h2>
      <p>{SITE.name} isn’t for children under [minimum age]. If you believe a child has created an account, tell us and we’ll remove it.</p>

      <h2>Changes</h2>
      <p>We’ll update this page when our practices change and revise the date at the top.</p>
    </Legal>
  );
}
