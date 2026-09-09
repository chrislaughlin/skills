import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const [hfPath,remPath]=process.argv.slice(2);const hf=resolve(hfPath),rem=resolve(remPath);
const html=await readFile(join(hf,'compositions/frames/01-walkthrough.html'),'utf8');
const report=JSON.parse(await readFile(join(hf,'capture-report.json'),'utf8'));
const delivery=JSON.parse(await readFile(join(hf,'delivery.json'),'utf8'));
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const body=html.replace(/^<template>/,'').replace(/<\/template>$/,'').replace(/<style>[\s\S]*?<\/style>/,'').replace(/<script>[\s\S]*?<\/script>/,'').replace(/<video[\s\S]*?<\/video>/,'').replace(/<div id="walkthrough-ground" class="clip wt-ground"[^>]*><\/div>/,'');
const cards=[...html.matchAll(/id="walkthrough-copy-(\d+)" class="clip copy" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map(m=>({id:m[1],start:Number(m[2]),end:Number(m[2])+Number(m[3])}));
await mkdir(join(rem,'src'),{recursive:true});await mkdir(join(rem,'public'),{recursive:true});
await copyFile(join(hf,'assets/recording.mp4'),join(rem,'public/recording.mp4'));
await writeFile(join(rem,'src/design.json'),JSON.stringify({css,body,cards,report,delivery}));
await writeFile(join(rem,'src/index.tsx'),`import React from 'react';
import {AbsoluteFill,Composition,OffthreadVideo,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import data from './design.json';
const ease=(v:number)=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
const Demo:React.FC=()=>{
 const t=useCurrentFrame()/useVideoConfig().fps;const r=data.report;const sx=Math.min(1120/r.viewport.width,840/r.viewport.height),sy=sx;const originX=720+(1120-r.viewport.width*sx)/2,originY=150+(840-r.viewport.height*sy)/2;
 let p={x:r.viewport.width-50,y:r.viewport.height-50};let pulse:any=null;
 for(const e of r.pointer){if(e.type==='move'&&t>=e.start){const u=ease(Math.max(0,Math.min(1,(t-e.start)/(e.end-e.start))));p={x:e.from.x+(e.to.x-e.from.x)*u,y:e.from.y+(e.to.y-e.from.y)*u};}if(e.type==='click'&&t>=e.start&&t<e.start+.4)pulse=e;}
 const visible=t>=r.chapters[0].start&&t<r.chapters[r.chapters.length-1].end;
 const pu=pulse?(t-pulse.start)/.4:1;const pe=1-Math.pow(1-pu,3);
 const dynamic=data.cards.map(c=>'#walkthrough-copy-'+c.id+'{visibility:'+(t>=c.start&&t<c.end?'visible':'hidden')+'}').join('')+
 r.chapters.map((c,i)=>'#walkthrough-step-'+i+'{color:'+(t>=c.start&&t<c.end?'#B83F45':'#4D4D4D')+';font-weight:'+(t>=c.start&&t<c.end?'500':'400')+'}').join('')+
 '#walkthrough-progress{transform:scaleX('+t/data.delivery.duration+')}'+
 '#walkthrough-cursor{opacity:'+(visible?1:0)+';transform:translate('+(originX+p.x*sx-5.6)+'px,'+(originY+p.y*sy-5.2)+'px)}'+
 '#walkthrough-pulse{opacity:'+(pulse?.75*(1-pe):0)+';transform:translate('+(pulse?originX+pulse.at.x*sx-22:0)+'px,'+(pulse?originY+pulse.at.y*sy-22:0)+'px) scale('+(.2+1.5*pe)+')}';
 return <AbsoluteFill style={{background:'#FFFFFF'}}><style>{data.css+dynamic}</style><OffthreadVideo src={staticFile('recording.mp4')} muted style={{position:'absolute',left:720,top:150,width:1120,height:840,objectFit:'contain'}}/><div style={{position:'absolute',inset:0}} dangerouslySetInnerHTML={{__html:data.body}}/></AbsoluteFill>;
};
registerRoot(()=> <Composition id="TodoDemo" component={Demo} width={1920} height={1080} fps={30} durationInFrames={Math.round(data.delivery.duration*30)}/>);
`);
console.log('Remotion adapter uses the same recording, static design, instruction times and pointer events; React frame sampling replaces GSAP and HyperFrames timing.');
