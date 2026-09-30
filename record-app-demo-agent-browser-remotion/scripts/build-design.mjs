import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {escapeHtml as esc} from './contract.mjs';
const require=createRequire(import.meta.url);
const [capturePath,projectPath]=process.argv.slice(2);
if(!capturePath||!projectPath)throw new Error('Usage: node scripts/compose.mjs CAPTURE_DIRECTORY STATIC_DESIGN_DIRECTORY');
const capture=resolve(capturePath),project=resolve(projectPath);
const r=JSON.parse(await readFile(join(capture,'report.json'),'utf8'));
const j=JSON.parse(await readFile(join(capture,'journey.json'),'utf8'));
if(r.status!=='passed'||r.assertions.some(a=>!a.pass))throw new Error('Refusing to compose an unverified journey');
const D=Math.floor(r.duration*30)/30;
await mkdir(join(project,'assets'),{recursive:true});await mkdir(join(project,'compositions','frames'),{recursive:true});
await copyFile(join(capture,'recording.mp4'),join(project,'assets','recording.mp4'));
await copyFile(require.resolve('gsap/dist/gsap.min.js'),join(project,'assets','gsap.min.js'));
await copyFile(join(capture,'report.json'),join(project,'capture-report.json'));
const fit=Math.min(1120/r.viewport.width,840/r.viewport.height);
const screen={x:720+(1120-r.viewport.width*fit)/2,y:150+(840-r.viewport.height*fit)/2,w:r.viewport.width*fit,h:r.viewport.height*fit};
const sx=screen.w/r.viewport.width,sy=screen.h/r.viewport.height;

const cards=[{title:j.presentation?.introTitle??'See it in action.',instruction:j.presentation?.introInstruction??'Follow this workflow, one step at a time.',start:0,end:r.chapters[0].start,label:'A quick tour'},...r.chapters,{title:j.presentation?.outroTitle??'Now it’s your turn.',instruction:j.presentation?.outroInstruction??('Try it at '+new URL(r.url).host),label:'Your list, under control',start:r.chapters.at(-1).end,end:D}];
const cardHTML=cards.map((c,i)=>`<section id="walkthrough-copy-${i}" class="clip copy" data-start="${c.start}" data-duration="${c.end-c.start}" data-track-index="${i===0||i===cards.length-1?6:i<=3?4:5}"><p class="eyebrow">${i===0?'WORKFLOW OVERVIEW':i===cards.length-1?'KEEP MOVING':`STEP ${String(i).padStart(2,'0')} / ${String(r.chapters.length).padStart(2,'0')}`}</p><h1>${esc(c.title)}</h1><p class="instruction">${esc(c.instruction)}</p></section>`).join('\n');
const rail=r.chapters.map((c,i)=>`<div class="rail-row" id="walkthrough-step-${i}"><span class="rail-num">${String(i+1).padStart(2,'0')}</span><span>${esc(c.label)}</span></div>`).join('');
const pointerCode=r.pointer.map(p=>p.type==='move'?`tl.fromTo('#walkthrough-cursor',{x:${screen.x+p.from.x*sx-5.6},y:${screen.y+p.from.y*sy-5.2}},{x:${screen.x+p.to.x*sx-5.6},y:${screen.y+p.to.y*sy-5.2},duration:${p.end-p.start},ease:'power1.inOut',immediateRender:false},${p.start});`:`tl.fromTo('#walkthrough-pulse',{x:${screen.x+p.at.x*sx-22},y:${screen.y+p.at.y*sy-22},scale:.2,opacity:.75},{x:${screen.x+p.at.x*sx-22},y:${screen.y+p.at.y*sy-22},scale:1.7,opacity:0,duration:.4,ease:'power2.out',immediateRender:false},${p.start});`).join('\n');
const initial={x:screen.x+(r.viewport.width-50)*sx-5.6,y:screen.y+(r.viewport.height-50)*sy-5.2};
const font400=(await readFile(require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2'))).toString('base64');
const font500=(await readFile(require.resolve('@fontsource/inter/files/inter-latin-500-normal.woff2'))).toString('base64');
const html=`<template><div id="walkthrough-root" data-composition-id="walkthrough" data-width="1920" data-height="1080" data-fps="30" data-duration="${D}">
<style>
@font-face{font-family:'Demo Sans';font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${font400}) format('woff2')}
@font-face{font-family:'Demo Sans';font-style:normal;font-weight:500;src:url(data:font/woff2;base64,${font500}) format('woff2')}
#walkthrough-root{position:absolute;inset:0;width:1920px;height:1080px;font-family:'Demo Sans',sans-serif;color:#111111;overflow:hidden}
#walkthrough-root *{box-sizing:border-box} .wt-ground{position:absolute;inset:0;background:#FFFFFF}
.wt-brand{position:absolute;left:96px;top:67px;font-size:34px;font-weight:500;letter-spacing:-1px}.wt-brand b{color:#B83F45;font-weight:500}
.wt-series{position:absolute;left:96px;top:120px;font-size:19px;letter-spacing:2px;font-weight:500;color:#B83F45}
.copy{position:absolute;left:96px;top:222px;width:540px;height:394px}.copy .eyebrow{margin:0 0 25px;font-size:19px;letter-spacing:2px;color:#B83F45;font-weight:500}.copy h1{font-size:66px;font-weight:500;line-height:1.08;letter-spacing:-2.6px;margin:0 0 28px}.copy .instruction{font-size:29px;line-height:1.45;font-weight:400;margin:0;width:515px;color:#111111}
.wt-rail{position:absolute;left:96px;top:675px;width:525px}.rail-row{display:flex;align-items:center;gap:18px;height:37px;font-size:22px;color:#4D4D4D}.rail-num{font-size:16px;width:28px;letter-spacing:1px;font-variant-numeric:tabular-nums}
.wt-chrome{position:absolute;left:720px;top:98px;width:1120px;height:52px;border:1.5px solid rgba(184,63,69,.2);border-bottom:0;border-radius:14px 14px 0 0;background:rgba(184,63,69,.04);display:flex;align-items:center;padding:0 22px;gap:9px}.wt-dot{height:8px;width:8px;background:#B83F45;border-radius:50%}.wt-url{margin-left:24px;font-size:20px;color:#111111;font-weight:400}
.wt-border{position:absolute;left:719px;top:150px;width:1122px;height:841px;border:1.5px solid rgba(184,63,69,.2);pointer-events:none}
#walkthrough-video{position:absolute;left:720px;top:150px;width:1120px;height:840px;object-fit:contain;background:#F5F5F5}
.wt-footer{position:absolute;left:96px;top:1016px;font-size:18px;letter-spacing:.2px;color:#4D4D4D}.wt-footer-right{position:absolute;right:80px;top:1016px;font-size:18px;color:#4D4D4D}
.wt-progress-track{position:absolute;left:96px;top:976px;width:515px;height:4px;background:rgba(184,63,69,.15)}#walkthrough-progress{position:absolute;inset:0;background:#B83F45;transform-origin:left center}
#walkthrough-cursor{position:absolute;left:0;top:0;width:44px;height:44px;opacity:0;pointer-events:none;z-index:20}#walkthrough-pulse{position:absolute;left:0;top:0;width:44px;height:44px;border:3px solid #B83F45;border-radius:50%;opacity:0;pointer-events:none;z-index:19}
</style>
<div id="walkthrough-ground" class="clip wt-ground" data-start="0" data-duration="${D}" data-track-index="0"></div>
<div class="wt-brand">${esc(j.title)}<b> / </b>The essentials</div><div class="wt-series">PRODUCT WALKTHROUGH</div>
<div class="wt-chrome"><i class="wt-dot"></i><i class="wt-dot"></i><i class="wt-dot"></i><span class="wt-url">${esc(new URL(r.url).host+new URL(r.url).pathname)}</span></div>
<video id="walkthrough-video" class="clip" src="assets/recording.mp4" data-start="0" data-duration="${D}" data-media-start="0" data-track-index="2" muted playsinline></video><div class="wt-border"></div>
${cardHTML}<div class="wt-rail">${rail}</div><div class="wt-progress-track"><div id="walkthrough-progress"></div></div>
<div class="wt-footer">${esc(j.presentation?.footer??'Your workflow, step by step.')}</div><div class="wt-footer-right">${esc(j.title)} · ${esc(new URL(r.url).host)}</div>
<div id="walkthrough-pulse"></div><div id="walkthrough-cursor"><svg viewBox="0 0 24 24" width="44" height="44"><path d="M3 2.8 20.6 14 12.8 15.5 9 22 3 2.8Z" fill="#111111" stroke="#FFFFFF" stroke-width="1.4"/></svg></div>
<script>
const tl=gsap.timeline({paused:true});
gsap.set('#walkthrough-cursor',{x:${initial.x},y:${initial.y},opacity:0});
tl.set('#walkthrough-cursor',{opacity:1},${r.chapters[0].start});
tl.fromTo('#walkthrough-progress',{scaleX:0},{scaleX:1,duration:${D},ease:'none'},0);
${r.chapters.map((c,i)=>`tl.set('#walkthrough-step-${i}',{color:'#B83F45',fontWeight:500},${c.start});tl.set('#walkthrough-step-${i}',{color:'#4D4D4D',fontWeight:400},${c.end});`).join('\n')}
${pointerCode}
tl.set('#walkthrough-cursor',{opacity:0},${r.chapters.at(-1).end});
window.__timelines['walkthrough']=tl;
</script></div></template>`;
await writeFile(join(project,'compositions','frames','01-walkthrough.html'),html);
await writeFile(join(project,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(j.title)} demo</title><script src="assets/gsap.min.js"></script><style>body{margin:0;background:#FFFFFF}#root{width:1920px;height:1080px;position:relative;overflow:hidden;background:#FFFFFF}</style></head><body><div id="root" data-composition-id="root" data-width="1920" data-height="1080" data-fps="30" data-duration="${D}"><div id="walkthrough" class="clip" data-composition-id="walkthrough" data-composition-src="compositions/frames/01-walkthrough.html" data-start="0" data-duration="${D}" data-track-index="1"></div></div><script>window.__timelines['root']=gsap.timeline({paused:true});</script></body></html>`);
const shots=cards.map((c,i)=>`Scene ${i+1} (${c.start.toFixed(2)}–${c.end.toFixed(2)}s): ${c.title} ${c.instruction} Real recorded UI stays on the right; instructional copy changes on the left. The pointer is part of the native recorded footage. Camera locked.`).join('\n\n');
await writeFile(join(project,'STORYBOARD.md'),`---\nformat: 1920x1080\nduration: ${D}s\nmessage: "A verified application walkthrough."\narc: Demo Loop\nmode: autonomous\nmusic: none\n---\n\n## Video direction\n\nTemplate palette and type: white canvas, near-black type, red accent, embedded Inter (Demo Sans) with fixed 400 and 500 font files for renderer parity. One continuous real browser recording. Locked split layout prioritizes readable UI; copy follows each action. Short holds follow verified results. No invented UI, background movement, photos or music. The single pointer is captured natively by agent-browser. Remotion does not add a second pointer. Static window stage adapts browser-device-stage chrome. Captions are instructional cards, not narration subtitles.\n\n## Frame 1 — Verified application walkthrough\n\n- scene: One continuous browser journey with verified instruction chapters\n- duration: ${D}s\n- poster: 18s\n- transition_in: cut\n- status: animated\n- src: compositions/frames/01-walkthrough.html\n- type: feature_showcase\n- blueprint: compose\n- asset_candidates: assets/recording.mp4\n- focal: assets/recording.mp4\n- roles: recording = real UI source\n\n${shots}\n`);
await writeFile(join(project,'delivery.json'),JSON.stringify({duration:D,resolution:'1920x1080',silent:true,capture: r.url,assertionsPassed:r.assertions.filter(a=>a.pass).length,snapshots:cards.map(c=>Number(((c.start+c.end)/2).toFixed(2)))},null,2));
console.log(JSON.stringify({project,duration:D,snapshots:cards.map(c=>((c.start+c.end)/2).toFixed(2)).join(',')},null,2));
