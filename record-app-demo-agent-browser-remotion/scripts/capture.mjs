import {mkdir, readFile, chmod} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AgentBrowser, BrowserIssue} from './agent.mjs';
import {validateJourney, validateAssertion, validateTarget} from './contract.mjs';
import {loadAuth, outsideArtifacts, authenticate} from './auth.mjs';
import {acquireLock, beginRehearsal} from './budget.mjs';
import {synchronizeSegment, assemble} from './media.mjs';
import {readJson, writeJson, sleep, hash} from './io.mjs';

const skill = fileURLToPath(new URL('../', import.meta.url));
export function parseArguments(args) {
  const options = {}, positional = [];
  const valued = {'--session':'session', '--env-file':'envFile', '--env-map':'envMap', '--state-file':'stateFile', '--save-state':'saveState', '--instructions':'instructions', '--budget-file':'budgetFile', '--correction':'correction', '--resolution':'resolution'};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (valued[arg]) {if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`); options[valued[arg]] = args[++i];}
    else if (['--rehearse', '--resume', '--auth-stdin', '--starting-state-restored', '--headed'].includes(arg)) options[{'--rehearse':'rehearse', '--resume':'resume', '--auth-stdin':'authStdin', '--starting-state-restored':'startingStateRestored', '--headed':'headed'}[arg]] = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else positional.push(arg);
  }
  if (options.resume ? positional.length !== 1 || !options.resolution : positional.length !== 2 || !options.session) throw new Error('Usage: capture.mjs JOURNEY NEW_TAKE --session NAME [--rehearse --starting-state-restored]; or capture.mjs --resume TAKE --resolution FILE');
  if (options.resume && options.rehearse) throw new Error('Cannot combine resume and rehearse');
  return {options, positional};
}
export function validateResolution(resolution, pending) {
  if (!resolution?.instruction?.trim() || !['retry', 'confirm-completed', 'continue'].includes(resolution.decision) || !resolution.assertions?.length) throw new Error('Human resolution needs an instruction, decision and current-state assertions');
  for (const assertion of resolution.assertions) validateAssertion(assertion);
  if (resolution.target) validateTarget(resolution.target);
  if (pending?.uncertain && resolution.decision === 'retry' && resolution.outcome !== 'not-applied') throw new Error('An uncertain action needs explicit human confirmation that it was not applied before retry');
  if (resolution.decision === 'confirm-completed' && (!pending?.uncertain || !pending.recorded)) throw new Error('Only an uncertain action already issued in captured footage can be confirmed completed');
  if (pending?.kind === 'action' && resolution.decision === 'continue') throw new Error('Resolve the pending action explicitly');
}
async function readState(agent) {
  await agent.frame();
  const tabs = await agent.command('tab', 'list');
  const page = await agent.evaluate(`({url:location.href, signature:JSON.stringify({url:location.href,text:document.body.innerText,fields:Array.from(document.querySelectorAll('input,select,textarea')).filter(el=>el.type!=='password').map(el=>[el.name,el.value,el.checked])})})`);
  return {url: page.url, fingerprint: hash(page.signature), tabs};
}

export async function capture(args) {
  const {options, positional} = parseArguments(args);
  const out = resolve(options.resume ? positional[0] : positional[1]);
  const {auth, redact} = await loadAuth(options);
  let j, report, checkpoint, resolution;
  if (options.resume) {
    j = validateJourney(await readJson(join(out, 'journey.json')));
    report = await readJson(join(out, 'report.json')); checkpoint = await readJson(join(out, 'checkpoint.json'));
    if (report.status !== 'needs-human' || checkpoint.status !== 'needs-human') throw new Error('Only a paused take can resume');
    if (hash(j) !== checkpoint.journeyHash) throw new Error('Do not edit the persisted journey; provide a resolution target instead');
    if (report.mode !== 'capture') throw new Error('A failed rehearsal needs human resolution and a new journey, not recording resume');
    options.session = report.session;
    options.headed = report.browserSettings?.headed ?? false;
    resolution = await readJson(options.resolution);
    validateResolution(resolution, checkpoint.pending);
  } else {
    j = validateJourney(await readJson(positional[0]));
    if (auth.password && j.chapters.some(chapter => chapter.actions.some(action => action.type === 'type' && action.text === auth.password))) throw new Error('Do not record password entry; move login into the auth channel');
    if (options.rehearse && (j.rehearsalSafe !== true || !options.startingStateRestored)) throw new Error('Rehearsal requires rehearsalSafe=true and --starting-state-restored');
    await mkdir(out, {recursive: false, mode: 0o700});
    await mkdir(join(out, 'screenshots')); await mkdir(join(out, 'segments')); await mkdir(join(out, 'raw'));
    await writeJson(join(out, 'journey.json'), j);
    const instructions = options.instructions ? await readFile(options.instructions, 'utf8') : 'Original human instructions were not supplied to the runner. The authored journey is preserved.';
    await writeJson(join(out, 'source-spec.json'), {journey: j, instructions: redact(instructions)});
    report = {version: 2, mode: options.rehearse ? 'rehearsal' : 'capture', status: 'running', session: options.session, browserSettings: {headed: Boolean(options.headed)}, url: j.url, viewport: j.viewport, startedAt: new Date().toISOString(), chapters: [], assertions: [], pointer: [], segments: [], pageErrors: [], ignoredPageErrors: [], framing: [], interventions: [], timing: {method: 'decoded magenta slate per segment; browser performance clock for events', toleranceSeconds: 0.2}};
    checkpoint = {version: 1, status: 'running', journeyHash: hash(j), chapter: 0, action: 0, authenticated: false, targetId: null, pending: null, targetOverrides: {}};
  }
  const release = await acquireLock(join(out, 'run.lock'));
  let finishBudget, activeSegment, origin, resumeOffset = report.segments.reduce((sum, segment) => sum + (segment.duration ?? 0), 0);
  const agent = new AgentBrowser(options.session, {headed: options.headed});
  const budgetFile = resolve(options.budgetFile ?? join(dirname(out), 'rehearsal-budget.json'));
  const save = async () => {
    await writeJson(join(out, 'report.json'), redact(report));
    await writeJson(join(out, 'checkpoint.json'), redact(checkpoint));
    await writeJson(join(out, 'segments.json'), {version: 1, segments: report.segments});
  };
  const clock = async () => (await agent.evaluate('performance.timeOrigin + performance.now()')) / 1000;
  const now = async () => resumeOffset + (origin ? Math.max(0, await clock() - origin) : 0);
  async function allowedPage() {
    await agent.frame();
    const url = (await agent.command('get', 'url')).url;
    if (!j.allowedOrigins.includes(new URL(url).origin)) throw new BrowserIssue('Navigation reached an unapproved origin; ask the human to resolve it', {url});
    const tabs = await agent.command('tab', 'list');
    const list = tabs.tabs ?? [];
    if (list.length !== 1) throw new BrowserIssue('Multi-tab workflows are unsupported; resolve the new tab with the human');
  }
  async function check(assertion, record = true) {
    const key = ['count', 'text', 'value', 'checked', 'visible'].find(key => Object.hasOwn(assertion, key));
    const deadline = Date.now() + 7000;
    let actual, observation;
    do {
      observation = await agent.resolve(assertion.target);
      if (key === 'count') actual = observation.count;
      else if (key === 'visible' && observation.count === 0) actual = false;
      else if (observation.count !== 1) throw new BrowserIssue('Assertion target is missing or ambiguous', {assertion, ...observation});
      else if (key === 'visible') actual = observation.visible;
      else {
        const result = await agent.command(key === 'checked' ? 'is' : 'get', key, observation.selector);
        actual = result[key];
      }
      if (actual === assertion[key]) break;
      await sleep(100);
    } while (Date.now() < deadline);
    const event = {at: origin ? await now() : null, expected: assertion, actual, pass: actual === assertion[key]};
    if (record) report.assertions.push(event);
    if (!event.pass) throw new BrowserIssue('Expected application result was not observed', {assertion, actual});
  }
  async function screenshot(file) {await agent.frame(); await agent.command('screenshot', join(out, 'screenshots', file));}
  async function startSegment() {
    await agent.frame();
    const segment = {index: report.segments.length + 1, raw: `raw/segment-${report.segments.length + 1}.mp4`, start: resumeOffset, status: 'recording', synchronized: false};
    await agent.command('record', 'start', join(out, segment.raw), '--fps', '30', '--cursor');
    activeSegment = segment; report.segments.push(segment);
    await agent.evaluate(`(()=>{const el=document.createElement('div');el.id='demo-sync-slate';Object.assign(el.style,{position:'fixed',inset:'0',background:'#ff00ff',zIndex:'2147483647'});document.documentElement.append(el)})()`);
    await sleep(600);
    origin = await agent.evaluate(`(()=>{document.getElementById('demo-sync-slate').remove();return performance.timeOrigin+performance.now()})()`) / 1000;
    await save();
  }
  async function stopSegment() {
    if (!activeSegment) return;
    await agent.frame();
    activeSegment.elapsed = await clock() - origin;
    await agent.command('record', 'stop');
    activeSegment.status = 'processing';
    await save();
    await synchronizeSegment(activeSegment, out);
    resumeOffset += activeSegment.duration; activeSegment = null; origin = null;
    await save();
  }
  async function act(action, event) {
    if (action.type === 'reload') {
      event.issuedAt = await now(); checkpoint.pending.uncertain = true; checkpoint.pending.recorded = !options.rehearse; await save();
      await agent.command('reload');
      return;
    }
    const target = checkpoint.targetOverrides[`${checkpoint.chapter}:${checkpoint.action}`] ?? action.target;
    const resolved = await agent.resolve(target, {action: true});
    await agent.command('scrollintoview', resolved.selector);
    const box = await agent.command('get', 'box', resolved.selector);
    if (!box) throw new BrowserIssue('Control has no visible bounding box', {target});
    if (target.safeArea && !target.frameCss) {
      const {top = 0, bottom = 0, left = 0, right = 0} = target.safeArea;
      const pass = box.x >= left && box.y >= top && box.x + box.width <= j.viewport.width - right && box.y + box.height <= j.viewport.height - bottom;
      report.framing.push({target, box, pass});
      if (!pass) throw new BrowserIssue('Control is outside its safe area', {target, box});
    }
    if (target.safeArea && target.frameCss) throw new BrowserIssue('Iframe safe-area framing needs human adaptation');
    const offset = action.clickOffset ?? {x:box.width / 2,y:box.height / 2};
    if (offset.x >= box.width || offset.y >= box.height) throw new BrowserIssue('Click point is outside the visible control', {target, box, offset});
    // agent-browser 0.38.1's mouse CLI accepts integer coordinates only.
    const point = {x:Math.round(box.x+offset.x),y:Math.round(box.y+offset.y)};
    if ((!options.rehearse || action.clickOffset) && !target.frameCss && action.type !== 'press') await agent.command('mouse', 'move', point.x, point.y, '--duration', options.rehearse ? '0' : '350', '--steps', options.rehearse ? '1' : '18');
    // Re-resolve after scrolling/movement; DOM changes must not reuse stale refs.
    const fresh = await agent.resolve(target, {action: true});
    event.issuedAt = await now(); checkpoint.pending.uncertain = true; checkpoint.pending.recorded = !options.rehearse;
    await save();
    if (action.type === 'click' || action.type === 'dblclick') report.pointer.push({type: 'click', start: event.issuedAt, at: point, segment: activeSegment?.index});
    if (action.type === 'type') {
      await agent.command('fill', fresh.selector, '');
      await agent.command(options.rehearse ? 'fill' : 'type', fresh.selector, action.text);
    } else if (action.type === 'press') {await agent.command('focus', fresh.selector); await agent.command('press', action.key);}
    else if (action.type === 'select') await agent.command('select', fresh.selector, action.value);
    else if (action.clickOffset) {await agent.command('mouse','down'); await agent.command('mouse','up');}
    else await agent.command(action.type, fresh.selector);
  }
  try {
    await agent.preflight();
    if (options.rehearse) finishBudget = await beginRehearsal(budgetFile, j, options.correction);
    await save();
    if (options.resume) {
      // CDP target identity survives legitimate navigation, but not a replaced tab.
      await agent.frame();
      const tabs = await agent.command('tab', 'list');
      if (!tabs.tabs?.some(tab => tab.active && tab.targetId === checkpoint.targetId)) throw new Error('The original live tab is gone; cannot safely resume this take');
      await allowedPage();
      for (const assertion of resolution.assertions) await check(assertion, false);
      if (resolution.target) checkpoint.targetOverrides[`${checkpoint.chapter}:${checkpoint.action}`] = resolution.target;
      if (resolution.decision === 'confirm-completed') {
        const event = report.chapters[checkpoint.chapter].actions.at(-1);
        event.humanConfirmed = true; event.end = resumeOffset; checkpoint.action++;
      } else if (checkpoint.pending?.kind === 'action') report.chapters[checkpoint.chapter].actions.pop();
      report.interventions.at(-1).resolution = redact(resolution);
      report.resolvedAssertions ??= [];
      report.resolvedAssertions.push(...report.assertions.filter(assertion => !assertion.pass));
      report.assertions = report.assertions.filter(assertion => assertion.pass);
      report.intervention = null; checkpoint.pending = null;
      checkpoint.status = report.status = 'running';
      if (!checkpoint.authenticated) {
        await check({target: j.ready, visible: true}, false);
        checkpoint.authenticated = true;
        for (const assertion of j.initialAssertions ?? []) await check(assertion);
        await screenshot('00-initial.png');
      }
      else if (!report.chapters.length) for (const assertion of j.initialAssertions ?? []) await check(assertion);
    } else {
      checkpoint.pending = {kind: 'authentication', uncertain: false, recorded: false};
      await authenticate(agent, j, auth, {privateRoots: [skill, out]});
      checkpoint.targetId = (await agent.command('tab', 'list')).tabs?.find(tab => tab.active)?.targetId;
      await agent.command('set', 'viewport', j.viewport.width, j.viewport.height);
      await agent.command('set', 'media', 'light');
      await allowedPage();
      await check({target: j.ready, visible: true}, false);
      checkpoint.authenticated = true;
      await agent.frame();
      if (options.saveState) {
        const path = outsideArtifacts(options.saveState, [skill, out]);
        await agent.command('state', 'save', path); await chmod(path, 0o600);
      }
      checkpoint.pending = {kind: 'initial-assertions', uncertain: false};
      for (const assertion of j.initialAssertions ?? []) await check(assertion);
      await screenshot('00-initial.png'); checkpoint.pending = null;
    }
    if (!options.rehearse) {await startSegment(); if (!options.resume) await sleep((j.introSeconds ?? 3) * 1000);}
    else origin = await clock();
    for (; checkpoint.chapter < j.chapters.length; checkpoint.chapter++, checkpoint.action = 0) {
      const chapter = j.chapters[checkpoint.chapter];
      let recorded = report.chapters[checkpoint.chapter];
      if (!recorded) {recorded = {...chapter, start: await now(), actions: []}; report.chapters.push(recorded);}
      for (; checkpoint.action < chapter.actions.length; checkpoint.action++) {
        const action = chapter.actions[checkpoint.action], event = {...action, start: await now()}; recorded.actions.push(event);
        checkpoint.pending = {kind: 'action', chapter: checkpoint.chapter, action: checkpoint.action, uncertain: false, recorded: false}; await save();
        await act(action, event);
        await allowedPage();
        for (const assertion of action.assertions ?? []) await check(assertion);
        event.end = await now(); checkpoint.pending = null;
        await save();
        if (!options.rehearse) await sleep(180);
      }
      checkpoint.pending = {kind: 'chapter-assertions', chapter: checkpoint.chapter, uncertain: false};
      for (const assertion of chapter.assertions) await check(assertion);
      recorded.verifiedAt = await now();
      await screenshot(`${String(checkpoint.chapter + 1).padStart(2, '0')}.png`);
      if (!options.rehearse) await sleep(Math.max(500, (chapter.minSeconds - (await now() - recorded.start)) * 1000));
      recorded.end = await now(); checkpoint.pending = null; await save();
      console.log(`${checkpoint.chapter + 1}/${j.chapters.length}: ${chapter.label} verified`);
    }
    checkpoint.pending = {kind: 'final-checks', uncertain: false};
    await agent.frame();
    const errors = await agent.command('errors');
    for (const entry of errors.errors ?? []) {
      const message = typeof entry === 'string' ? entry : JSON.stringify(entry);
      report[(j.ignoredPageErrorPatterns ?? []).some(pattern => message.includes(pattern)) ? 'ignoredPageErrors' : 'pageErrors'].push(message);
    }
    if (report.pageErrors.length) throw new BrowserIssue('Application runtime errors need human review', {errors: report.pageErrors});
    if (!options.rehearse) {
      await sleep((j.outroSeconds ?? 3) * 1000); await stopSegment(); await assemble(report, out);
      report.chapters.at(-1).end = Math.min(report.chapters.at(-1).end, report.duration);
    } else report.duration = await now();
    checkpoint.pending = null; report.status = checkpoint.status = 'passed';
    report.finishedAt = new Date().toISOString(); await save();
    await finishBudget?.('passed');
    await agent.command('close');
    return {status: 'passed', directory: out};
  } catch (error) {
    // Browser ambiguity is an intervention, not an automatic retry signal.
    const issue = error instanceof BrowserIssue;
    try {if (activeSegment?.status === 'recording') await stopSegment();} catch (mediaError) {report.mediaError = redact(mediaError.message);}
    report.status = checkpoint.status = issue ? 'needs-human' : 'failed';
    report.error = redact(error.message);
    if (issue) {
      const intervention = {message: report.error, pending: checkpoint.pending, details: redact(error.details), choices: checkpoint.pending?.uncertain ? ['Confirm the action completed in captured footage', 'Confirm it was not applied and explicitly retry', 'End the take'] : ['Identify the intended control or route', 'Restore a compatible app state', 'End the take']};
      if (checkpoint.authenticated) {
        try {await screenshot(`intervention-${report.interventions.length + 1}.png`); intervention.screenshot = `screenshots/intervention-${report.interventions.length + 1}.png`; intervention.snapshot = redact((await agent.command('snapshot')).snapshot); checkpoint.observedState = await readState(agent);} catch {}
      } else {
        try {checkpoint.targetId ??= (await agent.command('tab', 'list')).tabs?.find(tab => tab.active)?.targetId;} catch {}
        intervention.note = 'Login/challenge details are omitted from artifacts; resolve authentication in this session, then resume with authenticated-state assertions.';
      }
      report.intervention = intervention; report.interventions.push(intervention);
      await writeJson(join(out, 'intervention.json'), redact(intervention));
    }
    await save();
    await finishBudget?.(report.status, checkpoint.pending?.uncertain ? 'uncertain' : issue && /target|control|ambiguous|missing/i.test(error.message) ? 'target' : 'technical');
    // Preserve the live session for human resolution, including MFA and failed takes.
    return {status: report.status, directory: out, message: report.error};
  } finally {await release();}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  capture(process.argv.slice(2)).then(result => {console.log(JSON.stringify(result)); if (result.status !== 'passed') process.exitCode = result.status === 'needs-human' ? 2 : 1;}).catch(error => {console.error(error.message); process.exitCode = 1;});
}
