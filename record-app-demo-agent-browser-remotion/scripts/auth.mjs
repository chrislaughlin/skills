import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {resolve, relative, isAbsolute, sep} from 'node:path';
import {BrowserIssue} from './agent.mjs';

export function redactor(secrets = []) {
  const values = [...new Set(secrets.filter(value => typeof value === 'string' && value.length))].sort((a, b) => b.length - a.length);
  // These fields come from the prepared public journey or runner bookkeeping,
  // never the credential channel. Preserve them even when a demo account's
  // username is "demo" or its password happens to equal a CSS identifier.
  const operational = new Set(['session', 'journeyHash', 'fingerprint', 'targetId', 'type', 'kind', 'status', 'mode', 'url', 'raw', 'file', 'css', 'frameCss', 'role', 'name', 'placeholder', 'testId', 'child', 'title', 'instruction', 'label']);
  const redact = value => {
    if (typeof value === 'string') {
      value = value.replace(/((?:username|password|passwd|token|secret|api[_-]?key)\s*(?:[:=]|\bis\b|\s)\s*)([^\s,;]+)/gi, '$1[REDACTED]');
      for (const secret of values) {
        if (secret.length >= 4) value = value.split(secret).join('[REDACTED]').split(encodeURIComponent(secret)).join('[REDACTED]');
        else if (value === secret) value = '[REDACTED]';
      }
      return value;
    }
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, /^(username|password|passwd|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)$/i.test(key) ? '[REDACTED]' : operational.has(key) ? entry : redact(entry)]));
    return value;
  };
  return redact;
}
export async function loadAuth(options, environment = process.env) {
  const file = options.envFile ? parseEnv(await readFile(options.envFile, 'utf8')) : {};
  const source = {...environment, ...file};
  const map = options.envMap ? JSON.parse(await readFile(options.envMap, 'utf8')) : {};
  for (const [key, value] of Object.entries(map)) if (!['DEMO_LOGIN_URL', 'DEMO_USERNAME', 'DEMO_PASSWORD', 'DEMO_STORAGE_STATE'].includes(key) || typeof value !== 'string') throw new Error('Invalid env mapping');
  const get = key => source[map[key] ?? key];
  let inline = {};
  if (options.authStdin) {let input = ''; for await (const chunk of process.stdin) input += chunk; inline = JSON.parse(input);}
  if (Object.keys(inline).some(key => !['loginUrl', 'username', 'password', 'storageState'].includes(key))) throw new Error('Invalid inline auth fields');
  const auth = {loginUrl: inline.loginUrl ?? get('DEMO_LOGIN_URL'), username: inline.username ?? get('DEMO_USERNAME'), password: inline.password ?? get('DEMO_PASSWORD'), storageState: options.stateFile ?? inline.storageState ?? get('DEMO_STORAGE_STATE')};
  if (Object.values(auth).some(value => value !== undefined && typeof value !== 'string')) throw new Error('Authentication details must be strings');
  if (!auth.storageState && Boolean(auth.username) !== Boolean(auth.password)) throw new Error('Supply both username and password');
  return {auth, redact: redactor([auth.username, auth.password, ...Object.entries(source).filter(([key]) => /password|passwd|token|secret|api[_-]?key/i.test(key)).map(([, value]) => value)])};
}
export function outsideArtifacts(path, roots) {
  const absolute = resolve(path);
  for (const root of roots) {
    const rel = relative(resolve(root), absolute);
    if (!rel || (!(rel === '..' || rel.startsWith('..' + sep)) && !isAbsolute(rel))) throw new Error('Keep auth state outside the skill and capture/delivery directories');
  }
  return absolute;
}
export async function authenticate(agent, journey, auth, options) {
  if (auth.storageState) {
    outsideArtifacts(auth.storageState, options.privateRoots);
    await agent.command('open');
    await agent.command('state', 'load', resolve(auth.storageState));
    await agent.command('open', journey.url);
  } else if (auth.username || auth.password) {
    if (!journey.auth) throw new BrowserIssue('Inspect the login form and supply journey.auth targets before logging in');
    const loginUrl = auth.loginUrl ?? journey.auth.loginUrl;
    if (!loginUrl || new URL(loginUrl).username || new URL(loginUrl).password || !journey.allowedOrigins.includes(new URL(loginUrl).origin)) throw new BrowserIssue('Specify an allowed login URL without embedded credentials');
    await agent.command('open', loginUrl);
    const username = await agent.resolve(journey.auth.usernameTarget, {action: true});
    await agent.sensitiveBatch([['fill', username.selector, auth.username]]);
    const password = await agent.resolve(journey.auth.passwordTarget, {action: true});
    await agent.sensitiveBatch([['fill', password.selector, auth.password]]);
    const submit = await agent.resolve(journey.auth.submitTarget, {action: true});
    await agent.command('click', submit.selector);
  } else await agent.command('open', journey.url);
}
