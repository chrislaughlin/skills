import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {run} from './io.mjs';

async function ffmpeg(args) {
  const result = await run('ffmpeg', ['-y', '-v', 'error', ...args], {timeout: 120000});
  if (result.code !== 0) throw new Error(`Video processing failed: ${result.stderr.slice(0, 500)}`);
}
export async function probe(path) {
  const result = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]);
  if (result.code !== 0) throw new Error('Cannot inspect recorded video');
  return JSON.parse(result.stdout);
}
export function findSlateEnd(bytes) {
  let last = -1;
  for (let i = 0; i < bytes.length; i += 3) if (bytes[i] > 230 && bytes[i + 1] < 30 && bytes[i + 2] > 230) last = i / 3;
  if (last < 0) throw new Error('Synchronization slate was not captured');
  return last + 1;
}
export async function synchronizeSegment(segment, directory) {
  const raw = join(directory, segment.raw), meta = await probe(raw), video = meta.streams.find(stream => stream.codec_type === 'video');
  const [n, d] = video.avg_frame_rate.split('/').map(Number);
  if (n / d !== 30) throw new Error('Source capture must be 30 fps');
  const pixels = join(directory, `segment-${segment.index}-pixels.rgb`);
  await ffmpeg(['-i', raw, '-vf', 'scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', pixels]);
  const first = findSlateEnd(await readFile(pixels));
  segment.sourceOffset = first / 30;
  // The same daemon-side performance clock measures slate removal and events.
  // Decode the slate boundary, then cut only frames observed after it.
  const available = Number(meta.format.duration) - segment.sourceOffset;
  const duration = Math.floor(Math.min(segment.elapsed, available) * 30) / 30;
  if (duration < 1 / 30 || Math.abs(duration - segment.elapsed) > 0.2) throw new Error('Recorded segment duration does not match measured events');
  segment.duration = duration;
  segment.file = `segments/segment-${segment.index}.mp4`;
  await ffmpeg(['-ss', String(segment.sourceOffset), '-i', raw, '-frames:v', String(Math.round(duration * 30)), '-an', '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', join(directory, segment.file)]);
  const {rm} = await import('node:fs/promises'); await rm(pixels);
  segment.synchronized = true; segment.status = 'verified'; segment.sourceFps = 30;
  return segment;
}
export async function assemble(report, directory) {
  if (report.segments.some(segment => segment.status !== 'verified' || !segment.synchronized)) throw new Error('Cannot assemble unverified segments');
  // Generated relative paths contain no arbitrary user filenames or quoting.
  const manifest = join(directory, 'segments.ffconcat');
  await writeFile(manifest, 'ffconcat version 1.0\n' + report.segments.map(segment => `file '${segment.file}'`).join('\n') + '\n');
  await ffmpeg(['-safe', '1', '-f', 'concat', '-i', manifest, '-an', '-c:v', 'copy', '-movflags', '+faststart', join(directory, 'recording.mp4')]);
  await ffmpeg(['-i', join(directory, 'recording.mp4'), '-f', 'null', '-']);
  report.duration = report.segments.reduce((sum, segment) => sum + segment.duration, 0);
}
