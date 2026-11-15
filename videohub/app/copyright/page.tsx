import type { Metadata } from "next";
import Legal from "@/components/Legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Copyright and takedowns" };

export default function Copyright() {
  return (
    <Legal title="Copyright and takedowns">
      <p>{SITE.name} respects the rights of creators and expects its users to do the same. If you believe a video on the site infringes your copyright, you can ask us to remove it.</p>

      <h2>Sending a takedown notice</h2>
      <p>Send a written notice to our designated copyright agent:</p>
      <p>{SITE.agent}<br />Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
      <p>Your notice should include:</p>
      <ol>
        <li>Your physical or electronic signature (the copyright owner or someone authorised to act for them).</li>
        <li>A description of the copyrighted work you say has been infringed.</li>
        <li>The web address (URL) of the video on {SITE.name}, so we can find it.</li>
        <li>Your name, address, phone number and email.</li>
        <li>A statement that you have a good-faith belief the use isn’t authorised by the copyright owner, its agent or the law.</li>
        <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you’re authorised to act for the copyright owner.</li>
      </ol>
      <p>Knowingly making false claims in a notice can have legal consequences, including liability for damages.</p>

      <h2>What happens next</h2>
      <p>When we receive a valid notice we’ll remove or disable access to the video and let the uploader know, including your notice details as required.</p>

      <h2>Counter-notices</h2>
      <p>If your video was removed and you believe that was a mistake, or that you have the right to use the material, you can send a counter-notice to the same address with: your signature; identification of the removed video and where it appeared; a statement under penalty of perjury that you have a good-faith belief it was removed by mistake or misidentification; and your name, address and phone number, plus consent to the jurisdiction of the courts for your address. We’ll forward it to the complaining party. If they don’t tell us within [10–14] business days that they’ve started a court action, we may restore the video.</p>

      <h2>Repeat infringers</h2>
      <p>We terminate the accounts of users who are repeat infringers in appropriate circumstances.</p>

      <h2>Other problems with a video</h2>
      <p>For anything that isn’t a copyright issue (harassment, illegal content and so on), use the Report button on the video page, or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </Legal>
  );
}
