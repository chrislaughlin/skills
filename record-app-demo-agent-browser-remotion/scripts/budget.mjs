import {open, mkdir, rm} from 'node:fs/promises';
import {dirname} from 'node:path';
import {hash, readJson, writeJson} from './io.mjs';

export function reserveRehearsal(budget, journey, correction) {
  if (journey.rehearsalSafe !== true) throw new Error('Rehearsal requires rehearsalSafe=true and a restorable starting state');
  const digest = hash(journey);
  if (budget.runs.length >= 2) throw new Error('Two rehearsals used; ask the human before further app execution');
  if (budget.runs.length) {
    const last = budget.runs.at(-1);
    if (last.status !== 'failed' && last.status !== 'needs-human') throw new Error('A passed or interrupted rehearsal cannot be repeated');
    if (last.journeyHash === digest || !correction?.trim()) throw new Error('Second rehearsal requires a changed journey and a concrete correction');
    if (last.interventionKind === 'target' || last.interventionKind === 'uncertain') throw new Error('Resolve the target or uncertain action with the human; do not use a corrective rehearsal');
  }
  const run = {journeyHash: digest, correction: correction ?? null, status: 'running', startedAt: new Date().toISOString()};
  budget.runs.push(run);
  return run;
}
export async function acquireLock(path) {
  await mkdir(dirname(path), {recursive: true});
  let handle;
  try {handle = await open(path, 'wx', 0o600);} catch {throw new Error('A run is active or interrupted. Inspect the lock and checkpoint before explicitly recovering it.');}
  await handle.writeFile(JSON.stringify({pid: process.pid, startedAt: new Date().toISOString()}));
  return async () => {await handle.close(); await rm(path);};
}
export async function readBudget(path) {
  try {return await readJson(path);} catch (error) {if (error.code === 'ENOENT') return {version: 1, runs: []}; throw error;}
}
export async function beginRehearsal(path, journey, correction) {
  const release = await acquireLock(path + '.lock');
  let budget, entry;
  try {
    budget = await readBudget(path); entry = reserveRehearsal(budget, journey, correction);
    await writeJson(path, budget);
  } catch (error) {await release(); throw error;}
  return async (status, interventionKind) => {
    entry.status = status; entry.interventionKind = interventionKind ?? null; entry.finishedAt = new Date().toISOString();
    try {await writeJson(path, budget);} finally {await release();}
  };
}
