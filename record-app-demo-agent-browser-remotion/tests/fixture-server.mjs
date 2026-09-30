import {createServer} from 'node:http';

const style = `<style>body{font:22px system-ui;background:#f6f7fb;color:#182238;margin:50px}main{background:white;padding:35px;max-width:600px;border-radius:16px}input,button,select{font:inherit;margin:8px;padding:12px}button{background:#315beb;color:white;border:0;border-radius:8px}input{border:1px solid #aaa}p{padding:10px;background:#eef3ff}</style>`;
const page = (title, body) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title>${style}<main>${body}</main></html>`;
export async function fixtureServer() {
  let saves = 0;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const send = html => {response.setHeader('Content-Type', 'text/html'); response.end(html);};
    if (url.pathname === '/login') return send(page('Demo sign in', `<h1>Sign in</h1><form method="post" action="/session"><label>Email <input name="email" type="email"></label><label>Password <input name="password" type="password"></label><button>Sign in</button></form>`));
    if (url.pathname === '/session') {
      let body = ''; for await (const chunk of request) body += chunk;
      const form = new URLSearchParams(body);
      if (form.get('email') !== 'demo@example.test' || form.get('password') !== 'fixture-private-927') {response.writeHead(403); return response.end('Invalid login');}
      response.writeHead(303, {'Set-Cookie': 'demo=authenticated; Path=/; HttpOnly; SameSite=Lax', Location: '/app'}); return response.end();
    }
    if (url.pathname === '/app') {
      if (!request.headers.cookie?.includes('demo=authenticated')) {response.writeHead(302, {Location: '/login'}); return response.end();}
      return send(page('Workspace', `<h1>Project workspace</h1><label>Project name <input id="project" value="Untitled"></label><button id="save">Save project</button><p id="result">No changes yet</p><script>document.querySelector('#save').onclick=()=>{document.querySelector('#result').textContent='Saved '+document.querySelector('#project').value;fetch('/save',{method:'POST'})}</script>`));
    }
    if (url.pathname === '/save') {saves++; return response.end('OK');}
    if (url.pathname === '/ambiguous') return send(page('Choose a workspace', `<h1>Choose your workspace</h1><section id="personal"><h2>Personal</h2><button>Open workspace</button></section><section id="team"><h2>Team</h2><button>Open workspace</button></section><p id="result">No workspace selected</p><script>document.querySelector('#personal button').onclick=()=>document.querySelector('#result').textContent='Personal workspace opened';document.querySelector('#team button').onclick=()=>document.querySelector('#result').textContent='Team workspace opened'</script>`));
    if (url.pathname === '/controls') return send(page('Controls', `<h1>Controls</h1><input aria-label="Note" id="note"><select id="choice"><option value="a">A</option><option value="b">B</option></select><button id="hover" onmouseover="this.dataset.hovered='yes'">Hover</button><iframe id="embed" src="/frame"></iframe><p id="result">Ready</p><script>document.querySelector('#note').onkeydown=e=>{if(e.key==='Enter')document.querySelector('#result').textContent='Entered '+e.target.value}</script>`));
    if (url.pathname === '/frame') return send(page('Frame', `<button id="inside">Inside frame</button><p id="result">Not clicked</p><script>document.querySelector('#inside').onclick=()=>document.querySelector('#result').textContent='Frame clicked'</script>`));
    response.writeHead(404); response.end('Not found');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url: `http://127.0.0.1:${server.address().port}`, server, saves: () => saves, close: () => new Promise(resolve => {server.close(resolve); server.closeAllConnections();})};
}
