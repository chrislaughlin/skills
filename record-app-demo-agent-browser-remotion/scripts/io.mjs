import {readFile, writeFile, rename, mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
export async function writeJson(path, value) {
  await mkdir(dirname(resolve(path)), {recursive: true});
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {mode: 0o600});
  await rename(temporary, path);
}
export function run(command, args, {input, cwd, env, timeout = 60000} = {}) {
  return new Promise((resolve, reject) => {
    const grouped = process.platform !== 'win32';
    const child = spawn(command, args, {cwd, env, detached: grouped, stdio: ['pipe', 'pipe', 'pipe']});
    let stdout = '', stderr = '', overflow = false, timedOut = false, escalation;
    const stop = () => {
      if (!child.pid) return;
      const signal = name => {try {if (grouped) process.kill(-child.pid, name); else child.kill(name);} catch {}};
      signal('SIGTERM');
      escalation ??= setTimeout(() => signal('SIGKILL'), 1000);
    };
    const collect = (stream, key) => stream.on('data', chunk => {
      if (key === 'stdout') stdout += chunk; else stderr += chunk;
      if (stdout.length + stderr.length > 16 * 1024 * 1024) {overflow = true; stop();}
    });
    collect(child.stdout, 'stdout'); collect(child.stderr, 'stderr');
    const timer = setTimeout(() => {timedOut = true; stop();}, timeout);
    const clear = () => {clearTimeout(timer); clearTimeout(escalation);};
    child.on('error', error => {clear(); reject(error);});
    child.on('close', code => {clear(); resolve({code, stdout, stderr, overflow, timedOut});});
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
