import { sendMail } from "./mail";
import { SITE } from "./site";

// Relative imports on purpose: the transcode worker runs outside Next.js and sends these too.
const base = () => process.env.APP_URL ?? "";

// Tells an uploader their video was removed by a moderator, why, and how to appeal.
export async function sendRemovalNotice(to: string, videoTitle: string, reason: string) {
  await sendMail(
    to,
    `Your video was removed from ${SITE.name}`,
    [
      `Hello,`,
      ``,
      `A moderator removed your video "${videoTitle}" from ${SITE.name}.`,
      ``,
      `Reason: ${reason}`,
      ``,
      `Our rules are in the Terms of Service: ${base()}/terms`,
      ``,
      `If you think this was a mistake, email ${SITE.email} with the video title and a short explanation, and we'll review it.`,
    ].join("\n")
  );
}

export async function sendReadyNotice(to: string, videoTitle: string, videoId: string) {
  await sendMail(
    to,
    `Your video is ready on ${SITE.name}`,
    [
      `Hello,`,
      ``,
      `"${videoTitle}" has finished processing and is now live:`,
      `${base()}/watch/${videoId}`,
    ].join("\n")
  );
}

export async function sendFailedNotice(to: string, videoTitle: string) {
  await sendMail(
    to,
    `We couldn't process your video on ${SITE.name}`,
    [
      `Hello,`,
      ``,
      `We couldn't process "${videoTitle}". The file may be damaged or in a format we don't support.`,
      ``,
      `You can try again or delete it from My videos: ${base()}/studio`,
      `If it keeps failing, try exporting the video as MP4 (H.264) and uploading it again.`,
    ].join("\n")
  );
}

export async function sendSuspensionNotice(to: string, reason: string) {
  await sendMail(
    to,
    `Your ${SITE.name} account has been suspended`,
    [
      `Hello,`,
      ``,
      `A moderator suspended your ${SITE.name} account.`,
      ``,
      `Reason: ${reason}`,
      ``,
      `Our rules are in the Terms of Service: ${base()}/terms`,
      ``,
      `If you think this was a mistake, email ${SITE.email} from this address and we'll review it.`,
    ].join("\n")
  );
}

export async function sendBulkRemovalNotice(to: string, count: number, reason: string) {
  await sendMail(
    to,
    `Your videos were removed from ${SITE.name}`,
    [
      `Hello,`,
      ``,
      `A moderator removed ${count} of your videos from ${SITE.name}.`,
      ``,
      `Reason: ${reason}`,
      ``,
      `Our rules are in the Terms of Service: ${base()}/terms`,
      ``,
      `If you think this was a mistake, email ${SITE.email} from this address and we'll review it.`,
    ].join("\n")
  );
}

export async function sendRestoredNotice(to: string, videoTitle: string, videoId: string) {
  await sendMail(
    to,
    `Your video was restored on ${SITE.name}`,
    [
      `Hello,`,
      ``,
      `After review, "${videoTitle}" has been restored and is visible again:`,
      `${base()}/watch/${videoId}`,
    ].join("\n")
  );
}

export async function sendAppealDecision(to: string, videoTitle: string, granted: boolean, note: string, videoId: string) {
  await sendMail(
    to,
    granted ? `Your appeal was successful on ${SITE.name}` : `Your appeal was declined on ${SITE.name}`,
    [
      `Hello,`,
      ``,
      granted
        ? `We reviewed your appeal and restored "${videoTitle}". It is visible again: ${base()}/watch/${videoId}`
        : `We reviewed your appeal about "${videoTitle}" and the removal stands.`,
      ...(note ? [``, `Note from the moderator: ${note}`] : []),
      ``,
      `Our rules are in the Terms of Service: ${base()}/terms`,
    ].join("\n")
  );
}
