import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
// Works with AWS S3, Cloudflare R2, or MinIO (set S3_ENDPOINT for the latter two).
const credentials = {
  accessKeyId: process.env.S3_KEY!,
  secretAccessKey: process.env.S3_SECRET!,
};
const region = process.env.S3_REGION ?? "auto";

// Used by the server for everything except presigning.
export const s3 = new S3Client({
  region,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials,
});
export const BUCKET = process.env.S3_BUCKET!;

// Browsers upload straight to storage through a presigned URL, so that URL must use an address the browser can reach.
// Normally that is the same as S3_ENDPOINT. Set S3_PUBLIC_ENDPOINT only when they differ (for example GitHub Codespaces).
export const s3Public = process.env.S3_PUBLIC_ENDPOINT
  ? new S3Client({ region, endpoint: process.env.S3_PUBLIC_ENDPOINT, forcePathStyle: true, credentials })
  : s3;

// Removes the original upload plus every transcoded file for a video.
export async function deleteVideoFiles(id: string) {
  const keys: { Key: string }[] = [{ Key: `raw/${id}` }];
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `videos/${id}/`, ContinuationToken: token }));
    keys.push(...(r.Contents ?? []).map(o => ({ Key: o.Key! })));
    token = r.NextContinuationToken;
  } while (token);
  for (let i = 0; i < keys.length; i += 1000)
    await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys.slice(i, i + 1000) } }));
}
