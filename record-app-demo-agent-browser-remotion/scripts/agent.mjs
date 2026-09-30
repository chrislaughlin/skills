import {fileURLToPath} from 'node:url';
import {access} from 'node:fs/promises';
import {run} from './io.mjs';

export class BrowserIssue extends Error {
  constructor(message, details = {}) {super(message); this.details = details;}
}
export class AgentBrowser {
  constructor(session, {execute = run, executable = fileURLToPath(new URL('../node_modules/.bin/agent-browser', import.meta.url)), headed = false} = {}) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(session)) throw new Error('Use a named session containing letters, numbers, _ or -');
    this.session = session; this.execute = execute; this.executable = executable;
    this.settings = ['--config', fileURLToPath(new URL('../assets/agent-browser.json', import.meta.url)), '--headed', String(headed)];
    // An inherited profile/auto-connect setting must not attach to a person's
    // own browser. Auth and session state enter only through the explicit API.
    this.environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('AGENT_BROWSER_')));
  }
  async preflight() {
    await access(this.executable);
    const result = await this.execute(this.executable, ['--version']);
    if (result.code !== 0 || result.stdout.trim() !== 'agent-browser 0.38.1') throw new Error('Run npm ci: agent-browser 0.38.1 is required');
  }
  async command(...args) {
    const result = await this.execute(this.executable, ['--session', this.session, '--json', ...args.map(String), ...this.settings], {env: this.environment});
    return this.parse(result);
  }
  parse(result) {
    let body;
    try {body = JSON.parse(result.stdout);} catch {throw new BrowserIssue('agent-browser returned no valid JSON response');}
    if (result.code !== 0 || body.success !== true) throw new BrowserIssue(body.error || 'agent-browser command failed');
    return body.data;
  }
  async sensitiveBatch(commands) {
    // Values travel on stdin, never as shell text or process arguments.
    const result = await this.execute(this.executable, ['--session', this.session, '--json', 'batch', '--bail', ...this.settings], {input: JSON.stringify(commands), env: this.environment});
    let bodies;
    try {bodies = JSON.parse(result.stdout);} catch {throw new BrowserIssue('Authentication command failed');}
    if (result.code !== 0 || !Array.isArray(bodies) || bodies.some(body => body.success !== true)) throw new BrowserIssue('Authentication command failed; resolve the login with the human');
  }
  async evaluate(script) {
    const result = await this.execute(this.executable, ['--session', this.session, '--json', 'eval', '--stdin', ...this.settings], {input: script, env: this.environment});
    return this.parse(result).result;
  }
  async frame(target = {}) {
    await this.command('frame', 'main');
    if (target.frameCss) {
      const result = await this.command('get', 'count', target.frameCss);
      if (result.count !== 1) throw new BrowserIssue('Iframe locator is missing or ambiguous', {count: result.count, target});
      await this.command('frame', target.frameCss);
    }
  }
  async resolve(target, {action = false} = {}) {
    await this.frame(target);
    let result;
    if (target.role) {
      const snapshot = await this.command('snapshot');
      let matches = Object.entries(snapshot.refs ?? {}).filter(([, ref]) => ref.role === target.role && ref.name === target.name);
      if (target.nth !== undefined) matches = matches.slice(target.nth, target.nth + 1);
      result = {count: matches.length, candidates: matches.map(([ref, info]) => ({ref: '@' + ref, ...info}))};
      if (matches.length === 1) result.selector = '@' + matches[0][0];
    } else {
      const documentExpression = target.frameCss ? `document.querySelector(${JSON.stringify(target.frameCss)}).contentDocument` : 'document';
      result = await this.evaluate(`(()=>{const doc=${documentExpression};if(!doc)throw new Error('Cross-origin CSS queries require a semantic role/name target');return (${inspectDOM.toString()})(${JSON.stringify(target)},doc)})()`);
    }
    if (action && result.count !== 1) throw new BrowserIssue(result.count ? 'Action target is ambiguous' : 'Action target is missing', {target, ...result});
    if (result.count === 1) {
      result.visible = (await this.command('is', 'visible', result.selector)).visible;
      result.enabled = (await this.command('is', 'enabled', result.selector)).enabled;
      if (action && (!result.visible || !result.enabled)) throw new BrowserIssue('Action target is hidden or disabled', {target, ...result});
    }
    return result;
  }
}

// Read-only DOM query. Resolve scoped CSS to a fresh, unique native CSS path;
// do not inject app data, dispatch synthetic actions or cache selectors across steps.
export function inspectDOM(target, doc = document) {
  const all = Array.from(doc.querySelectorAll('*'));
  let elements;
  if (target.css) elements = Array.from(doc.querySelectorAll(target.css));
  else if (target.placeholder) elements = all.filter(el => el.getAttribute('placeholder') === target.placeholder);
  else if (target.testId) elements = all.filter(el => el.getAttribute('data-testid') === target.testId);
  else if (target.label) elements = all.filter(el => el.getAttribute('aria-label') === target.label || Array.from(el.labels ?? []).some(label => label.textContent.trim() === target.label));
  else elements = all.filter(el => el.textContent.trim() === target.exactText && !Array.from(el.children).some(child => child.textContent.trim() === target.exactText));
  if (target.text) elements = elements.filter(el => el.textContent.includes(target.text));
  if (target.child) elements = [...new Set(elements.flatMap(el => Array.from(el.querySelectorAll(target.child))))];
  if (target.nth !== undefined) elements = elements.slice(target.nth, target.nth + 1);
  const selectorFor = element => {
    const parts = [];
    for (let el = element; el && el.nodeType === 1; el = el.parentElement) {
      const tag = el.tagName.toLowerCase(), siblings = Array.from(el.parentElement?.children ?? []).filter(sibling => sibling.tagName === el.tagName);
      parts.unshift(`${CSS.escape(tag)}:nth-of-type(${siblings.indexOf(el) + 1 || 1})`);
    }
    return parts.join(' > ');
  };
  return {count: elements.length, selector: elements.length === 1 ? selectorFor(elements[0]) : null,
    candidates: elements.slice(0, 8).map(el => ({selector: selectorFor(el), text: el.textContent.trim().slice(0, 160), tag: el.tagName.toLowerCase()}))};
}
