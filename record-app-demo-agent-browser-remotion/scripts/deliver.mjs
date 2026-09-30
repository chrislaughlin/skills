import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stat} from 'node:fs/promises';
import {readJson, run} from './io.mjs';
import {assertDeliverable} from './contract.mjs';

const [capturePath, projectPath] = process.argv.slice(2);
if (!capturePath || !projectPath) throw new Error('Usage: deliver.mjs PASSED_CAPTURE NEW_REMOTION_PROJECT');
const capture = resolve(capturePath), project = resolve(projectPath), scripts = dirname(fileURLToPath(import.meta.url));
assertDeliverable(await readJson(join(capture, 'report.json')));
async function command(executable, args, cwd) {
  const result = await run(executable, args, {cwd, timeout: 600000});
  if (result.code !== 0) throw new Error(`${executable} failed: ${result.stderr.slice(-2000)}`);
  if (result.stdout.trim()) console.log(result.stdout.trim());
}
await command(process.execPath, [join(scripts, 'compose.mjs'), capture, project]);
await command('npm', ['ci', '--no-audit', '--no-fund'], project);
// Remotion manages its own rendering browser. No Playwright capture dependency.
await command('npm', ['run', 'render', '--', '--log', 'error'], project);
const delivery = await readJson(join(project, 'delivery.json'));
const video = join(project, 'renders/video.mp4');
await command(process.execPath, [join(scripts, 'verify.mjs'), video, String(delivery.duration)]);
console.log(JSON.stringify({video, bytes: (await stat(video)).size, project, contactSheet: join(project, 'renders/contact-sheet.jpg'), clickBoundaries: join(project, 'renders/click-boundaries.jpg'), verificationReport: video + '.verification.json'}));
