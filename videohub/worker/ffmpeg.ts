import { spawn } from "node:child_process";
import path from "node:path";

function exec(cmd: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    p.stdout.on("data", d => (out += d));
    p.on("error", reject); // e.g. ffmpeg not installed
    p.on("close", code => (code === 0 ? resolve(out.trim()) : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

// Writes master.m3u8 + a 720p and a 360p HLS rendition + thumb.jpg into `dir`.
export async function transcodeToHls(input: string, dir: string) {
  // Videos without an audio track need a different stream map, and very short videos need an earlier thumbnail frame.
  const hasAudio = (await exec("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", input])) !== "";
  const duration = parseFloat(await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input])) || 0;

  await exec("ffmpeg", [
    "-v", "error", "-y", "-i", input,
    "-filter_complex", "[0:v]split=2[a][b];[a]scale=-2:720[v720];[b]scale=-2:360[v360]",
    ...(hasAudio ? ["-map", "[v720]", "-map", "0:a", "-map", "[v360]", "-map", "0:a"] : ["-map", "[v720]", "-map", "[v360]"]),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", ...(hasAudio ? ["-c:a", "aac"] : []),
    "-b:v:0", "2500k", "-b:v:1", "800k",
    "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod",
    "-master_pl_name", "master.m3u8", "-var_stream_map", hasAudio ? "v:0,a:0 v:1,a:1" : "v:0 v:1",
    "-hls_segment_filename", path.join(dir, "v%v_%03d.ts"), path.join(dir, "v%v.m3u8"),
  ]);

  const seek = Math.min(2, duration / 2).toFixed(2);
  await exec("ffmpeg", ["-v", "error", "-y", "-i", input, "-ss", seek, "-vframes", "1", "-vf", "scale=640:-2", path.join(dir, "thumb.jpg")]);
}
