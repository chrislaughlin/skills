export function validateJourney(j) {
  if (j.version !== 1) throw new Error('Unsupported journey version');
  const url = new URL(j.url);
  if (!['http:','https:'].includes(url.protocol) || !j.allowedOrigins?.includes(url.origin)) throw new Error('URL origin is not allowed');
  if (!j.title || !Array.isArray(j.chapters) || !j.chapters.length) throw new Error('Title and chapters are required');
  for (const key of ['width','height']) if (!Number.isInteger(j.viewport?.[key]) || j.viewport[key]<240 || j.viewport[key]>3840) throw new Error('Invalid viewport');
  for(const key of ['introSeconds','outroSeconds']) if(j[key]!==undefined&&(!Number.isFinite(j[key])||j[key]<0||j[key]>30)) throw new Error('Invalid intro/outro duration');
  for (const c of j.chapters) {
    if (!c.title || !c.instruction || !c.assertions?.length || !c.actions?.length) throw new Error('Every chapter needs instructions, actions and assertions');
    if (!(c.minSeconds>=1 && c.minSeconds<=60)) throw new Error('Invalid chapter duration');
    for(const a of c.actions) if(!['type','press','click','dblclick','hover','select','reload'].includes(a.type)) throw new Error(`Unsupported action: ${a.type}`);
    for(const a of [...c.actions,...c.assertions]) if(a.type!=='reload') validateTarget(a.target);
    for(const a of c.assertions) if(['count','text','value','checked','visible'].filter(k=>Object.hasOwn(a,k)).length!==1) throw new Error('An assertion must specify exactly one expected result');
  }
  return j;
}
function validateTarget(t) {
  if(!t || !['css','role','placeholder','testId','exactText'].some(k=>typeof t[k]==='string')) throw new Error('Missing locator');
}
export function locator(page,t) {
  let l = t.css ? page.locator(t.css) : t.role ? page.getByRole(t.role,{name:t.name,exact:true}) : t.placeholder ? page.getByPlaceholder(t.placeholder,{exact:true}) : t.testId ? page.getByTestId(t.testId) : page.getByText(t.exactText,{exact:true});
  if(t.text) l=l.filter({hasText:t.text});
  if(t.child) l=l.locator(t.child);
  if(t.nth!==undefined) l=l.nth(t.nth);
  return l;
}
export function escapeHtml(s) { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
