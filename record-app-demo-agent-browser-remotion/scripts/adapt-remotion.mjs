import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const [hfPath,remPath]=process.argv.slice(2);const hf=resolve(hfPath),rem=resolve(remPath);
const html=await readFile(join(hf,'compositions/frames/01-walkthrough.html'),'utf8');
const report=JSON.parse(await readFile(join(hf,'capture-report.json'),'utf8'));
const delivery=JSON.parse(await readFile(join(hf,'delivery.json'),'utf8'));
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const body=html.replace(/^<template>/,'').replace(/<\/template>$/,'').replace(/<style>[\s\S]*?<\/style>/,'').replace(/<script>[\s\S]*?<\/script>/,'').replace(/<video[\s\S]*?<\/video>/,'').replace(/<div id="walkthrough-pulse"><\/div>/,'').replace(/<div id="walkthrough-cursor">[\s\S]*?<\/div>/,'').replace(/<div id="walkthrough-ground" class="clip wt-ground"[^>]*><\/div>/,'');
const cards=[...html.matchAll(/id="walkthrough-copy-(\d+)" class="clip copy" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map(m=>({id:m[1],start:Number(m[2]),end:Number(m[2])+Number(m[3])}));
await mkdir(join(rem,'src'),{recursive:true});await mkdir(join(rem,'public'),{recursive:true});
await copyFile(join(hf,'assets/recording.mp4'),join(rem,'public/recording.mp4'));
await writeFile(join(rem,'src/design.json'),JSON.stringify({css,body,cards,report,delivery}));
await writeFile(join(rem,'src/index.tsx'),`import React from 'react';
import {AbsoluteFill,Composition,OffthreadVideo,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import data from './design.json';
const Demo:React.FC=()=>{
 const t=useCurrentFrame()/useVideoConfig().fps;const r=data.report;
 const dynamic=data.cards.map(c=>'#walkthrough-copy-'+c.id+'{visibility:'+(t>=c.start&&t<c.end?'visible':'hidden')+'}').join('')+
 r.chapters.map((c,i)=>'#walkthrough-step-'+i+'{color:'+(t>=c.start&&t<c.end?'#B83F45':'#4D4D4D')+';font-weight:'+(t>=c.start&&t<c.end?'500':'400')+'}').join('')+
 '#walkthrough-progress{transform:scaleX('+t/data.delivery.duration+')}';
 return <AbsoluteFill style={{background:'#FFFFFF'}}><style>{data.css+dynamic}</style><OffthreadVideo src={staticFile('recording.mp4')} muted style={{position:'absolute',left:720,top:150,width:1120,height:840,objectFit:'contain'}}/><div style={{position:'absolute',inset:0}} dangerouslySetInnerHTML={{__html:data.body}}/></AbsoluteFill>;
};
registerRoot(()=> <Composition id="TodoDemo" component={Demo} width={1920} height={1080} fps={30} durationInFrames={Math.round(data.delivery.duration*30)}/>);
`);
console.log('Remotion adapter uses the native cursor recording, static design and measured chapter times; React frame sampling replaces GSAP and HyperFrames timing.');
