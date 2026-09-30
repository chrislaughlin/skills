import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixtureServer} from './fixture-server.mjs';
import {capture} from '../scripts/capture.mjs';
import {AgentBrowser} from '../scripts/agent.mjs';
import {writeJson, readJson} from '../scripts/io.mjs';

test('live runner supports select, hover, reload, iframe clicks and key focus', {skip: process.env.DEMO_BROWSER_TESTS !== '1', timeout: 60000}, async () => {
  const fixture = await fixtureServer(), work = await mkdtemp(join(tmpdir(), 'demo-controls-')), session = `demo-controls-${Date.now()}`;
  try {
    const j = {version:1,title:'Controls',url:fixture.url+'/controls',allowedOrigins:[fixture.url],viewport:{width:880,height:660},ready:{role:'heading',name:'Controls'},rehearsalSafe:true,chapters:[
      {label:'Edit controls',title:'Edit controls.',instruction:'Enter a note, select B and hover.',minSeconds:1,actions:[{type:'type',target:{label:'Note'},text:'Launch'},{type:'press',target:{label:'Note'},key:'Enter'},{type:'select',target:{css:'#choice'},value:'b'},{type:'hover',target:{css:'#hover'}}],assertions:[{target:{css:'#result'},text:'Entered Launch'},{target:{css:'#choice'},value:'b'}]},
      {label:'Use frame',title:'Use the embedded panel.',instruction:'Click inside the frame.',minSeconds:1,actions:[{type:'click',target:{frameCss:'#embed',css:'#inside'}}],assertions:[{target:{frameCss:'#embed',css:'#result'},text:'Frame clicked'}]},
      {label:'Reload',title:'Start fresh.',instruction:'Reload the app.',minSeconds:1,actions:[{type:'reload'}],assertions:[{target:{css:'#result'},text:'Ready'}]}
    ]};
    const spec = join(work,'journey.json'); await writeJson(spec,j);
    const result = await capture([spec,join(work,'rehearsal'),'--session',session,'--rehearse','--starting-state-restored']);
    assert.equal(result.status,'passed',result.message);
    assert.equal((await readJson(join(work,'rehearsal/report.json'))).assertions.length,4);
  } finally {await fixture.close(); try {await new AgentBrowser(session).command('close');} catch {} await rm(work,{recursive:true,force:true});}
});
