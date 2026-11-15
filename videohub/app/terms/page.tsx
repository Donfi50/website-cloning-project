import type { Metadata } from "next";
import Link from "next/link";
import Legal from "@/components/Legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <Legal title="Terms of Service">
      <p>By creating an account or using {SITE.name}, you agree to these terms. If you don’t agree, please don’t use the service.</p>

      <h2>1. Who can use {SITE.name}</h2>
      <p>You must be at least [minimum age: 13, or higher where your country requires it] to use the service. You’re responsible for the accuracy of your account details, for keeping your password safe, and for everything done through your account.</p>

      <h2>2. Your content</h2>
      <p>You keep ownership of the videos, titles, descriptions, comments and playlists you post. You give {SITE.name} a worldwide, non-exclusive, royalty-free licence to store, process (including converting video to other formats), display and distribute that content as needed to run the service. This licence ends when you delete the content, apart from short-lived backups and copies we must keep for legal reasons.</p>
      <p>You promise that you have the rights to everything you upload and that it follows these terms.</p>

      <h2>3. Rules</h2>
      <p>Don’t post, share or link to content that:</p>
      <ul>
        <li>is illegal where you or we operate;</li>
        <li>sexualises or endangers minors in any way. We have zero tolerance, remove it immediately and report it to the authorities;</li>
        <li>shows intimate images of anyone without their consent;</li>
        <li>threatens, harasses, doxxes or promotes violence or hatred against people;</li>
        <li>infringes someone else’s copyright, trademark or other rights;</li>
        <li>contains malware, scams or spam, or impersonates another person or organisation.</li>
      </ul>
      <p>Don’t abuse the service: no scraping at scale, no bypassing rate limits or security measures, and no manipulating views, likes or reports.</p>

      <h2>4. Reports and moderation</h2>
      <p>Anyone signed in can report a video with the Report button. We may remove content, restrict features or suspend accounts that break these terms or that we reasonably believe are harmful, with or without notice. If you think we made a mistake, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we’ll take another look.</p>

      <h2>5. Copyright</h2>
      <p>We respond to valid copyright notices and remove infringing content. See <Link href="/copyright">Copyright and takedowns</Link> for how to send a notice or a counter-notice. Accounts that repeatedly infringe will be terminated.</p>

      <h2>6. Ending your account</h2>
      <p>You can stop using {SITE.name} at any time and delete your videos from your studio page. You can download your data and permanently delete your account from your account page. We may suspend or end accounts that break these terms.</p>

      <h2>7. No warranty</h2>
      <p>The service is provided “as is” and “as available”. We don’t promise it will be uninterrupted or error-free, or that content from other users is accurate or safe.</p>

      <h2>8. Limits on liability</h2>
      <p>To the fullest extent the law allows, {SITE.name} and its operators aren’t liable for indirect or consequential losses, or for content posted by users. [Add any liability cap and carve-outs your lawyer recommends.]</p>

      <h2>9. Changes</h2>
      <p>We may update these terms. If the changes are significant we’ll tell you on the site or by email. Continuing to use {SITE.name} after that means you accept the new terms.</p>

      <h2>10. Law and contact</h2>
      <p>These terms are governed by the laws of [your jurisdiction], and disputes go to the courts of [your jurisdiction], except where local consumer law says otherwise. Questions: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </Legal>
  );
}
