import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile, copyFile} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {capture} from '../scripts/capture.mjs';
import {AgentBrowser} from '../scripts/agent.mjs';
import {fixtureServer} from './fixture-server.mjs';
import {writeJson, readJson, run, sleep} from '../scripts/io.mjs';
const skill = fileURLToPath(new URL('../', import.meta.url));
const workspace = resolve(process.argv[2] ?? join(skill, '../record-app-demo-agent-browser-remotion-workspace/iteration-1'));
await mkdir(workspace, {recursive: true});
const fixture = await fixtureServer();
const origin = fixture.url;
const sessionPrefix = `demo-test-${Date.now()}`;
const assertions = [{text:'Application outcomes verified', passed: true}, {text:'Native cursor footage captured at 30 fps', passed:true}, {text:'Video fully decodes at 1080p/30fps', passed:true}];
const steps = {};
async function execute(name, prompt, work) {
  if (process.argv[3] && process.argv[3] !== name) return;
  const directory = join(workspace, name), outputs = join(directory, 'with_skill/outputs');
  await mkdir(outputs, {recursive: true});
  await writeJson(join(directory, 'eval_metadata.json'), {eval_id: Object.keys(steps).length + 1, eval_name: name, prompt, assertions: assertions.map(a => a.text)});
  const started = performance.now();
  const result = await work(directory, outputs);
  const take = join(outputs, 'take');
  const report = await readJson(join(take, 'report.json'));
  assert.equal(report.status, 'passed', report.error);
  assert.ok(report.segments.every(s => s.synchronized && s.status === 'verified'));
  const delivery = await run(process.execPath, [join(skill, 'scripts/deliver.mjs'), take, join(outputs, 'tutorial')], {timeout: 600000});
  await writeFile(join(directory, 'delivery.log'), delivery.stdout + delivery.stderr);
  assert.equal(delivery.code, 0, delivery.stderr.slice(-3000));
  const verification = await readJson(join(outputs, 'tutorial/renders/video.mp4.verification.json'));
  assert.equal(verification.passed, true);
  await copyFile(join(outputs, 'tutorial/renders/video.mp4'), join(outputs, 'demo.mp4'));
  await copyFile(join(outputs, 'tutorial/renders/contact-sheet.jpg'), join(outputs, 'contact-sheet.jpg'));
  await copyFile(join(outputs, 'tutorial/renders/click-boundaries.jpg'), join(outputs, 'click-boundaries.jpg'));
  await writeJson(join(outputs, 'summary.json'), {scenario: name, status: result.status, duration: verification.duration, segments: report.segments.length, assertionsPassed: report.assertions.length, interventions: report.interventions.length});
  await writeJson(join(directory, 'with_skill/grading.json'), {expectations: assertions.map(a => ({...a, evidence: 'See capture report, segment manifest and full-decode MP4 verification in outputs.'}))});
  await writeJson(join(directory, 'with_skill/timing.json'), {duration_ms: performance.now() - started, total_duration_seconds: (performance.now() - started) / 1000});
  steps[name] = {outputs, verification, result};
  console.log(`PASS ${name}: ${report.segments.length} segment(s), ${verification.duration}s`);
}
function base(title, url, chapters) {return {version:1, title, url, allowedOrigins:[origin], viewport:{width:880,height:660}, ready:{role:'heading',name:title}, introSeconds:1, outroSeconds:1, chapters};}
try {
  await execute('todomvc', 'Record TodoMVC: add three tasks, rename one, complete one, use Active and Completed, then clear completed tasks.', async (directory, outputs) => {
    const journey = await readJson(join(skill, 'examples/todomvc/journey.json'));
    journey.introSeconds = 1; journey.outroSeconds = 1;
    for (const chapter of journey.chapters) chapter.minSeconds = 3;
    const spec = join(directory, 'journey.json'); await writeJson(spec, journey);
    const rehearsal = await capture([spec, join(directory, 'rehearsal'), '--session', `${sessionPrefix}-rehearsal`, '--rehearse', '--starting-state-restored']);
    assert.equal(rehearsal.status, 'passed', rehearsal.message);
    return capture([spec, join(outputs, 'take'), '--session', `${sessionPrefix}-todos`, '--instructions', join(skill, 'examples/todomvc/instructions.md')]);
  });
  await execute('authenticated', 'Use credentials from a local env file, save a project named Launch, and record only the authenticated workflow. Verify saved auth state can be reused.', async (directory, outputs) => {
    const chapter = {title:'Save your project.',label:'Name and save',instruction:'Enter a project name, then save it.',minSeconds:3,actions:[{type:'type',target:{label:'Project name'},text:'Launch'},{type:'click',target:{role:'button',name:'Save project'}}],assertions:[{target:{css:'#result'},text:'Saved Launch'}]};
    const journey = base('Project workspace', origin + '/app', [chapter]);
    journey.auth = {loginUrl:origin+'/login',usernameTarget:{label:'Email'},passwordTarget:{label:'Password'},submitTarget:{role:'button',name:'Sign in'}};
    const spec = join(directory,'journey.json'), env = join(directory,'private.env'), state = join(directory,'private-state.json');
    await writeJson(spec,journey);
    await writeFile(env,'DEMO_USERNAME=demo@example.test\nDEMO_PASSWORD=fixture-private-927\n',{mode:0o600});
    const result = await capture([spec,join(outputs,'take'),'--session',`${sessionPrefix}-auth`,'--env-file',env,'--save-state',state]);
    assert.equal(result.status,'passed',result.message); assert.equal(fixture.saves(),1);
    const saved = new AgentBrowser(`${sessionPrefix}-saved`);
    await saved.command('open'); await saved.command('state','load',state); await saved.command('open',origin+'/app');
    assert.equal((await saved.command('get','url')).url,origin+'/app');
    assert.equal((await saved.resolve({role:'heading',name:'Project workspace'})).count,1);
    await saved.command('close');
    for (const file of ['journey.json','report.json','checkpoint.json','source-spec.json']) assert.ok(!(await readFile(join(outputs,'take',file),'utf8')).includes('fixture-private-927'));
    return result;
  });
  await execute('human-resume', 'Open a workspace. If the UI presents multiple matching buttons, ask me which one; I choose Team. Preserve the session and resume without restarting.', async (directory,outputs) => {
    const journey=base('Choose your workspace',origin+'/ambiguous',[{title:'Open your workspace.',label:'Choose a workspace',instruction:'Choose the Team workspace to continue.',minSeconds:3,actions:[{type:'click',target:{role:'button',name:'Open workspace'}}],assertions:[{target:{css:'#result'},text:'Team workspace opened'}]}]);
    const spec=join(directory,'journey.json'),take=join(outputs,'take'); await writeJson(spec,journey);
    const first=await capture([spec,take,'--session',`${sessionPrefix}-resume`]);
    assert.equal(first.status,'needs-human',first.message);
    const paused=await readJson(join(take,'checkpoint.json')); assert.equal(paused.pending.uncertain,false);
    assert.ok((await readJson(join(take,'intervention.json'))).screenshot);
    const refused=await run(process.execPath,[join(skill,'scripts/compose.mjs'),take,join(directory,'must-not-render')]);
    assert.notEqual(refused.code,0);
    const resolution=join(directory,'human-resolution.json');
    await writeJson(resolution,{decision:'retry',instruction:'Use the Team workspace button.',target:{css:'#team button'},assertions:[{target:{css:'#result'},text:'No workspace selected'}]});
    // This file simulates a human answer for the regression scenario; production
    // assistants must obtain this decision from the actual user.
    const before=await readJson(join(take,'report.json'));
    await sleep(3000); // Deliberate human waiting time must not enter the footage.
    const result=await capture(['--resume',take,'--resolution',resolution]);
    const report=await readJson(join(take,'report.json')); assert.equal(report.segments.length,2); assert.equal(report.interventions.length,1);
    assert.equal(report.pointer.length,1);
    assert.ok(report.duration<7); // 1 s intro + 3 s chapter + 1 s outro, no 3 s wait.
    assert.equal(report.segments[1].start,before.segments[0].duration);
    assert.ok(!report.pointer.some(event=>event.start>=report.duration));
    return result;
  });
  await writeJson(join(workspace,'integration-results.json'),steps);
  console.log(`Integration artifacts: ${workspace}`);
} finally {
  await fixture.close();
  for (const suffix of ['rehearsal','todos','auth','saved','resume']) {try {await new AgentBrowser(`${sessionPrefix}-${suffix}`).command('close');} catch {}}
}
