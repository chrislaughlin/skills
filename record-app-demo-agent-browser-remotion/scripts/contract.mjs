const actions = ['type', 'press', 'click', 'dblclick', 'hover', 'select', 'reload'];
export function validateTarget(target) {
  if (!target || typeof target !== 'object') throw new Error('Missing target');
  const kinds = ['css', 'role', 'placeholder', 'testId', 'exactText', 'label'];
  if (kinds.filter(key => typeof target[key] === 'string' && target[key]).length !== 1) throw new Error('Target needs exactly one locator');
  if (target.role && typeof target.name !== 'string') throw new Error('Role targets need an exact accessible name');
  if (target.css?.includes('>>>') || target.css?.includes('text=') || target.css?.startsWith('@')) throw new Error('Use CSS or semantic targets, not frozen refs or Playwright selectors');
  if (target.frameCss !== undefined && (typeof target.frameCss !== 'string' || !target.frameCss)) throw new Error('Invalid frame locator');
  if (target.nth !== undefined && (!Number.isInteger(target.nth) || target.nth < 0)) throw new Error('Invalid nth index');
  for (const key of ['text', 'child']) if (target[key] !== undefined && (typeof target[key] !== 'string' || !target[key])) throw new Error(`Invalid ${key}`);
  if (target.role && (target.text || target.child)) throw new Error('Use scoped CSS for role targets with text/child filters');
  if (target.safeArea !== undefined) {
    if (!target.safeArea || typeof target.safeArea !== 'object' || Array.isArray(target.safeArea)) throw new Error('Invalid safeArea');
    for (const [key, value] of Object.entries(target.safeArea)) if (!['top', 'right', 'bottom', 'left'].includes(key) || !Number.isFinite(value) || value < 0) throw new Error('Invalid safeArea margin');
  }
}
export function validateAssertion(assertion) {
  validateTarget(assertion.target);
  const keys = ['count', 'text', 'value', 'checked', 'visible'].filter(key => Object.hasOwn(assertion, key));
  if (keys.length !== 1) throw new Error('An assertion needs exactly one expected result');
  const key = keys[0], value = assertion[key];
  if (key === 'count' ? !Number.isInteger(value) || value < 0 : ['checked', 'visible'].includes(key) ? typeof value !== 'boolean' : typeof value !== 'string') throw new Error('Invalid assertion value');
}
export function validateJourney(journey) {
  if (journey.version !== 1) throw new Error('Unsupported journey version');
  const url = new URL(journey.url);
  if (url.username || url.password) throw new Error('Supply credentials through the private auth channel, not the URL');
  if (!['http:', 'https:'].includes(url.protocol) || !journey.allowedOrigins?.includes(url.origin)) throw new Error('URL origin is not allowed');
  for (const origin of journey.allowedOrigins) if (new URL(origin).origin !== origin) throw new Error('allowedOrigins must be exact origins');
  if (!journey.title || !journey.chapters?.length || journey.chapters.length > 7) throw new Error('Title and one to seven chapters are required');
  for (const key of ['width', 'height']) if (!Number.isInteger(journey.viewport?.[key]) || journey.viewport[key] < 240 || journey.viewport[key] > 3840) throw new Error('Invalid viewport');
  validateTarget(journey.ready);
  for (const key of ['introSeconds', 'outroSeconds']) if (journey[key] !== undefined && (!Number.isFinite(journey[key]) || journey[key] < 0 || journey[key] > 30)) throw new Error('Invalid intro/outro duration');
  if (journey.rehearsalSafe !== undefined && typeof journey.rehearsalSafe !== 'boolean') throw new Error('Invalid rehearsalSafe');
  if (journey.ignoredPageErrorPatterns !== undefined && (!Array.isArray(journey.ignoredPageErrorPatterns) || journey.ignoredPageErrorPatterns.some(value => typeof value !== 'string' || !value.trim()))) throw new Error('Invalid ignoredPageErrorPatterns');
  for (const assertion of journey.initialAssertions ?? []) validateAssertion(assertion);
  for (const chapter of journey.chapters) {
    if (!chapter.title || !chapter.label || !chapter.instruction || !chapter.actions?.length || !chapter.assertions?.length) throw new Error('Chapters need copy, actions and assertions');
    if (!Number.isFinite(chapter.minSeconds) || chapter.minSeconds < 1 || chapter.minSeconds > 60) throw new Error('Invalid chapter duration');
    for (const action of chapter.actions) {
      if (!actions.includes(action.type)) throw new Error(`Unsupported action: ${action.type}`);
      if (action.type !== 'reload') validateTarget(action.target);
      for (const [type, key] of [['type', 'text'], ['press', 'key'], ['select', 'value']]) if (action.type === type && typeof action[key] !== 'string') throw new Error(`Missing action ${key}`);
      if (action.clickOffset !== undefined && (action.type !== 'click' || action.target.frameCss || !Number.isFinite(action.clickOffset?.x) || !Number.isFinite(action.clickOffset?.y) || action.clickOffset.x < 0 || action.clickOffset.y < 0)) throw new Error('clickOffset needs nonnegative x/y on a main-page click');
      for (const assertion of action.assertions ?? []) validateAssertion(assertion);
    }
    for (const assertion of chapter.assertions) validateAssertion(assertion);
  }
  if (journey.auth) {
    const allowed = ['loginUrl', 'usernameTarget', 'passwordTarget', 'submitTarget'];
    if (Object.keys(journey.auth).some(key => !allowed.includes(key))) throw new Error('Auth in a journey contains only login URL and targets, never credentials');
    for (const key of allowed.slice(1)) validateTarget(journey.auth[key]);
    if (journey.auth.loginUrl) {
      const login = new URL(journey.auth.loginUrl);
      if (login.username || login.password) throw new Error('Supply login credentials through the private auth channel');
      if (!journey.allowedOrigins.includes(login.origin)) throw new Error('Login origin is not allowed');
    }
  }
  return journey;
}
export function assertDeliverable(report) {
  if (report.status !== 'passed' || report.mode !== 'capture' || report.intervention || !report.assertions?.length || report.assertions.some(a => !a.pass) || !report.segments?.length || report.segments.some(s => s.status !== 'verified' || !s.synchronized)) throw new Error('Refusing to deliver an unverified journey or segment');
}
export function escapeHtml(value) {return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));}
