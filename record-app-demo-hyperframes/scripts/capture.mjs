import { chromium } from 'playwright';
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import {validateJourney,locator} from './contract.mjs';
const [specPath,outPath,urlOverride]=process.argv.slice(2);
if(!specPath||!outPath) throw new Error('Usage: node scripts/capture.mjs journey.json NEW_OUTPUT_DIRECTORY [url]');
const j=JSON.parse(await readFile(specPath,'utf8'));if(urlOverride)j.url=urlOverride;validateJourney(j);
const out=resolve(outPath);await mkdir(out);await mkdir(join(out,'screenshots'));await mkdir(join(out,'raw'));
await writeFile(join(out,'journey.json'),JSON.stringify(j,null,2));
const report={version:1,status:'running',url:j.url,startedAt:new Date().toISOString(),browser:null,viewport:j.viewport,chapters:[],pointer:[],assertions:[],pageErrors:[],failedRequests:[],timing:{method:'magenta slate first clean video frame; wall clock action cues',toleranceSeconds:0.12}};
let browser,context,page,origin=0,rawPath;
const now=()=> (performance.now()-origin)/1000;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function check(a) {
 const l=locator(page,a.target);let actual,pass=false;const deadline=performance.now()+7000;
 do {
  actual=Object.hasOwn(a,'count')?await l.count():Object.hasOwn(a,'text')?await l.innerText():Object.hasOwn(a,'value')?await l.inputValue():Object.hasOwn(a,'checked')?await l.isChecked():await l.isVisible();
  const key=['count','text','value','checked','visible'].find(k=>Object.hasOwn(a,k));
  pass=actual===a[key];if(pass)break;await delay(100);
 }while(performance.now()<deadline);
 report.assertions.push({at:origin?now():null,expected:a,actual,pass});
 if(!pass)throw new Error(`Assertion failed: ${JSON.stringify(a)}; actual ${JSON.stringify(actual)}`);
}
let pointer={x:j.viewport.width-50,y:j.viewport.height-50};
async function move(l) {
 await l.scrollIntoViewIfNeeded();const box=await l.boundingBox();if(!box)throw new Error('Target has no visible box');
 const to={x:box.x+box.width/2,y:box.y+box.height/2};const start=now();const from={...pointer};
 for(let i=1;i<=18;i++){const u=i/18,e=u*u*(3-2*u);await page.mouse.move(from.x+(to.x-from.x)*e,from.y+(to.y-from.y)*e);await delay(22);}
 report.pointer.push({type:'move',start,end:now(),from,to});pointer=to;await delay(150);
}
try {
 browser=await chromium.launch({headless:true});report.browser=browser.version();
 context=await browser.newContext({...(process.env.DEMO_STORAGE_STATE?{storageState:process.env.DEMO_STORAGE_STATE}:{}),viewport:j.viewport,recordVideo:{dir:join(out,'raw'),size:j.viewport},locale:'en-GB',timezoneId:'Europe/London',colorScheme:'light'});
 await context.route('**/*',async route=>{const req=route.request();if(req.isNavigationRequest()&&req.frame()===page?.mainFrame()&&!j.allowedOrigins.includes(new URL(req.url()).origin)){await route.abort();return;}await route.continue();});
 page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 const response=await page.goto(j.url,{waitUntil:'networkidle',timeout:30000});
 if(!response?.ok())throw new Error(`Navigation HTTP ${response?.status()}`);
 await locator(page,j.ready).waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);await delay(500);
 for(const a of j.initialAssertions??[])await check(a);
 await page.screenshot({path:join(out,'screenshots','00-initial.png')});
 await page.evaluate(()=>{const el=document.createElement('div');el.id='demo-sync-slate';Object.assign(el.style,{position:'fixed',inset:'0',background:'#ff00ff',zIndex:'2147483647'});document.documentElement.append(el);});
 await delay(500);
 origin=performance.now();await page.evaluate(()=>document.getElementById('demo-sync-slate').remove());
 await delay((j.introSeconds??3)*1000);
 for(let i=0;i<j.chapters.length;i++){
  const chapter=j.chapters[i],c={...chapter,start:now(),actions:[]};report.chapters.push(c);
  for(const a of chapter.actions){
   const event={...a,start:now()};c.actions.push(event);
   if(a.type==='reload'){await page.reload({waitUntil:'networkidle'});await locator(page,j.ready).waitFor();}
   else {
    const l=locator(page,a.target);if(await l.count()!==1)throw new Error(`Action locator must match exactly one element: ${JSON.stringify(a.target)}`);
    if(a.type!=='press')await move(l);
    if(a.type==='type'){await l.fill('');await l.pressSequentially(a.text,{delay:48});}
    else if(a.type==='press')await l.press(a.key);
    else if(a.type==='click'||a.type==='dblclick'){report.pointer.push({type:'click',start:now(),at:{...pointer}});await l[a.type]();}
    else if(a.type==='select')await l.selectOption(a.value);
    else await l.hover();
   }
   event.end=now();await delay(180);
  }
  for(const a of chapter.assertions)await check(a);
  c.verifiedAt=now();
  await page.screenshot({path:join(out,'screenshots',`${String(i+1).padStart(2,'0')}.png`)});
  await delay(Math.max(1000,(chapter.minSeconds-(now()-c.start))*1000));c.end=now();console.log(`${i+1}/${j.chapters.length}: ${chapter.label} verified`);
 }
 await delay((j.outroSeconds??3)*1000);report.duration=now();
 if(report.pageErrors.length)throw new Error(`Application raised ${report.pageErrors.length} runtime errors`);
 rawPath=await page.video().path();await context.close();context=null;await browser.close();browser=null;
 // The synchronization slate is detected from actual decoded frames, not an assumed navigation delay.
 const probe=spawnSync('ffmpeg',['-v','error','-i',rawPath,'-vf','scale=1:1:flags=area','-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:8*1024*1024});
 if(probe.status!==0)throw new Error(probe.stderr.toString());
 const meta=JSON.parse(spawnSync('ffprobe',['-v','error','-show_streams','-of','json',rawPath],{encoding:'utf8'}).stdout);const [n,d]=meta.streams[0].r_frame_rate.split('/').map(Number),fps=n/d;
 report.recordingSize={width:meta.streams[0].width,height:meta.streams[0].height};
 let last=-1;for(let i=0;i<probe.stdout.length;i+=3)if(probe.stdout[i]>230&&probe.stdout[i+1]<30&&probe.stdout[i+2]>230)last=i/3;
 if(last<0)throw new Error('Synchronization slate not found');
 report.sourceOffset=(last+1)/fps;report.sourceFps=fps;
 const trim=spawnSync('ffmpeg',['-y','-v','error','-ss',String(report.sourceOffset),'-i',rawPath,'-t',String(report.duration),'-an','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',join(out,'recording.mp4')],{encoding:'utf8'});
 if(trim.status!==0)throw new Error(trim.stderr);
 report.status='passed';report.rawRecording=rawPath;await copyFile(specPath,join(out,'source-spec.json'));
}catch(e){report.status='failed';report.error=e.stack;try{await page?.screenshot({path:join(out,'failure.png')});}catch{}process.exitCode=1;console.error(e.message);}
finally{if(context)await context.close();if(browser)await browser.close();report.finishedAt=new Date().toISOString();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));}
