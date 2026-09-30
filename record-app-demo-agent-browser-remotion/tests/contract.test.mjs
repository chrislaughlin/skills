import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateJourney, validateTarget, assertDeliverable, escapeHtml} from '../scripts/contract.mjs';
import {AgentBrowser} from '../scripts/agent.mjs';
import {redactor, outsideArtifacts} from '../scripts/auth.mjs';
import {reserveRehearsal, beginRehearsal, readBudget} from '../scripts/budget.mjs';
import {validateResolution, parseArguments} from '../scripts/capture.mjs';
import {findSlateEnd} from '../scripts/media.mjs';
import {run} from '../scripts/io.mjs';
import {fileURLToPath} from 'node:url';
const example = JSON.parse(await readFile(new URL('../examples/todomvc/journey.json', import.meta.url)));
const response = data => ({code: 0, stdout: JSON.stringify({success: true, data})});

test('journey retains supported actions, frames and framing', () => {const j = structuredClone(example); j.chapters[0].actions[0].target.frameCss = '#frame'; j.chapters[0].actions[0].target.safeArea = {top: 80}; assert.equal(validateJourney(j), j);});
test('reject unsupported actions, origins, empty results and invalid targets', () => {
  for (const alter of [j => j.url = 'https://other.test', j => j.chapters[0].assertions = [], j => j.chapters[0].actions[0].type = 'evaluate', j => j.chapters[0].actions[0].target = {css: '.x', role: 'button', name: 'x'}]) {const j = structuredClone(example); alter(j); assert.throws(() => validateJourney(j));}
  assert.throws(() => validateTarget({css: '@e1'})); assert.throws(() => validateTarget({role: 'button'}));
});
test('secrets are redacted without destroying auth target definitions', () => {
  const redact = redactor(['s$cret`value', 'demo@example.test']);
  const input = {auth: {passwordTarget: {css: '#password'}}, password: 's$cret`value', note: 'email demo@example.test and password=anything'};
  const result = redact(input);
  assert.equal(result.auth.passwordTarget.css, '#password'); assert.equal(result.password, '[REDACTED]'); assert.ok(!JSON.stringify(result).includes('s$cret')); assert.ok(!result.note.includes('demo@example.test')); assert.ok(!result.note.includes('anything'));
});
test('common demo credentials cannot corrupt checkpoints or public editorial copy', () => {
  const redact=redactor(['demo','password','a']);
  const metadata={session:'demo-launch',journeyHash:'a'.repeat(64),title:'Make a demo',instruction:'Save a project',target:{css:'#password'},password:'password',note:'username a, password a'};
  const result=redact(metadata);
  for(const key of ['session','journeyHash','title','instruction']) assert.equal(result[key],metadata[key]);
  assert.equal(result.target.css,'#password');assert.equal(result.password,'[REDACTED]');assert.ok(!result.note.includes(' a'));
});
test('auth state must stay outside artifact roots', () => {assert.throws(() => outsideArtifacts('/tmp/demo/state.json', ['/tmp/demo'])); assert.throws(() => outsideArtifacts('/tmp/demo/..private.json', ['/tmp/demo'])); assert.equal(outsideArtifacts('/tmp/private/state.json', ['/tmp/demo']), '/tmp/private/state.json');});
test('rehearsal budget survives process restarts and requires concrete correction', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'demo-budget-')), path = join(dir, 'budget.json');
  try {
    const finish = await beginRehearsal(path, example); await finish('failed', 'technical');
    const next = structuredClone(example); next.chapters[0].minSeconds++;
    await assert.rejects(beginRehearsal(path, example, 'fix'), /changed journey/);
    const finishNext = await beginRehearsal(path, next, 'Correct a measured timing setting'); await finishNext('passed');
    assert.equal((await readBudget(path)).runs.length, 2);
    await assert.rejects(beginRehearsal(path, example, 'again'), /Two rehearsals/);
  } finally {await rm(dir, {recursive: true, force: true});}
});
test('ambiguous or uncertain rehearsals require human resolution', () => {const budget = {runs: [{status: 'needs-human', journeyHash: 'different', interventionKind: 'target'}]}; assert.throws(() => reserveRehearsal(budget, example, 'guess another control'), /human/);});
test('never retry an uncertain action without explicit not-applied evidence', () => {
  const base = {decision: 'retry', instruction: 'Use the team workspace', assertions: [{target: {css: '#result'}, text: 'No workspace selected'}]};
  assert.throws(() => validateResolution(base, {kind: 'action', uncertain: true}), /not applied/);
  assert.doesNotThrow(() => validateResolution({...base, outcome: 'not-applied'}, {kind: 'action', uncertain: true}));
  assert.throws(() => validateResolution({...base, decision: 'confirm-completed'}, {uncertain: false}), /already issued/);
});
test('delivery blocks failed takes, unresolved interventions and unsynchronized segments', () => {
  const report = {status: 'passed', mode: 'capture', assertions: [{pass: true}], segments: [{status: 'verified', synchronized: true}]};
  assert.doesNotThrow(() => assertDeliverable(report));
  for (const change of [{status: 'needs-human'}, {intervention: {}}, {segments: [{status: 'verified', synchronized: false}]}, {assertions: [{pass: false}]}, {mode: 'rehearsal'}]) assert.throws(() => assertDeliverable({...report, ...change}), /unverified/);
});
test('slate synchronization is decoded from footage, not assumed', () => {assert.equal(findSlateEnd(Buffer.from([10, 10, 10, 255, 0, 255, 255, 0, 255, 20, 20, 20])), 3); assert.throws(() => findSlateEnd(Buffer.from([10, 10, 10])), /not captured/);});
test('semantic targets use a new snapshot each time and reject ambiguity', async () => {
  let snapshots = 0;
  const agent = new AgentBrowser('test', {execute: async (_bin, args) => {
    const command = args[3];
    if (command === 'snapshot') {snapshots++; return response({refs: snapshots === 1 ? {e1: {role: 'button', name: 'Save'}, e2: {role: 'button', name: 'Save'}} : {[`e${snapshots + 2}`]: {role: 'button', name: 'Save'}}});}
    if (command === 'is') return response({visible: true, enabled: true});
    return response({});
  }});
  await assert.rejects(agent.resolve({role: 'button', name: 'Save'}, {action: true}), /ambiguous/);
  assert.equal((await agent.resolve({role: 'button', name: 'Save'}, {action: true})).selector, '@e4');
  assert.equal((await agent.resolve({role: 'button', name: 'Save'}, {action: true})).selector, '@e5');
});
test('credential values travel over stdin with no shell interpolation', async () => {
  const secret = 'value$(touch /tmp/should-not-exist)`'; let observed;
  const agent = new AgentBrowser('test', {execute: async (command, args, options) => {observed = {command, args, options}; return {code: 0, stdout: '[{"success":true}]'};}});
  await agent.sensitiveBatch([['fill', '#password', secret]]);
  assert.ok(!observed.args.join(' ').includes(secret)); assert.equal(JSON.parse(observed.options.input)[0][2], secret);
});
test('CLI requires a named session and explicit resume resolution', () => {assert.throws(() => parseArguments(['journey.json', 'take'])); assert.throws(() => parseArguments(['--resume', 'take'])); assert.equal(parseArguments(['journey.json', 'take', '--session', 'demo']).options.session, 'demo');});
test('editorial text is escaped', () => assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;'));
test('a timed-out command terminates its process group', async () => {
  const start=Date.now();
  const result=await run(process.execPath,['-e','setInterval(()=>{},1000)'],{timeout:100});
  assert.equal(result.timedOut,true); assert.notEqual(result.code,0); assert.ok(Date.now()-start<3000);
});
test('packaged native capture composes independently and has no duplicate pointer', async () => {
  const work = await mkdtemp(join(tmpdir(),'demo-portable-'));
  try {
    const project = join(work,'tutorial');
    const result = await run(process.execPath,[fileURLToPath(new URL('../scripts/compose.mjs',import.meta.url)),fileURLToPath(new URL('../examples/todomvc/capture',import.meta.url)),project],{cwd:work});
    assert.equal(result.code,0,result.stderr);
    const design = JSON.parse(await readFile(join(project,'src/design.json'),'utf8'));
    assert.equal(design.body.includes('id="walkthrough-cursor"'),false);
    assert.equal(design.body.includes('id="walkthrough-pulse"'),false);
    assert.equal(design.report.segments.every(segment=>segment.synchronized),true);
    await access(join(project,'public/recording.mp4'));
  } finally {await rm(work,{recursive:true,force:true});}
});
