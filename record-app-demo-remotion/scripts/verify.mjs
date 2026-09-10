import {spawnSync} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
const [input,expected]=process.argv.slice(2),duration=Number(expected);
if(!input||!Number.isFinite(duration)||duration<=0)throw new Error('Usage: node scripts/verify.mjs VIDEO.mp4 EXPECTED_DURATION_SECONDS');
const path=resolve(input);
function run(args){const p=spawnSync(args[0],args.slice(1),{encoding:'utf8'});if(p.error)throw p.error;if(p.status!==0)throw new Error(p.stderr);return p.stdout;}
const metadata=JSON.parse(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',path]));const video=metadata.streams.find(s=>s.codec_type==='video');
run(['ffmpeg','-v','error','-i',path,'-f','null','-']);
const passed=video?.codec_name==='h264'&&video.width===1920&&video.height===1080&&video.avg_frame_rate==='30/1'&&Number(video.nb_frames)===Math.round(duration*30)&&Math.abs(Number(metadata.format.duration)-duration)<1/30;
const project=dirname(dirname(path)),renders=dirname(path),fps=30,lastFrame=Math.max(0,Math.round(duration*fps)-1);
async function optionalJson(file){try{return JSON.parse(await readFile(file,'utf8'));}catch{return null;}}
function normalizeTimes(times){return [...new Set(times.map(time=>Math.max(0,Math.min(lastFrame,Math.round(time*fps)))))]}
function makeSheet(times,output,columns){
 const frames=normalizeTimes(times),rows=Math.ceil(frames.length/columns),cellWidth=columns>2?480:640,cellHeight=columns>2?270:360;
 const select=frames.map(frame=>`eq(n\\,${frame})`).join('+');
 run(['ffmpeg','-y','-v','error','-i',path,'-vf',`select=${select},scale=${cellWidth}:${cellHeight},tile=${columns}x${rows}:nb_frames=${frames.length}:padding=8:margin=8`,'-fps_mode','vfr','-frames:v','1','-q:v','2',output]);
 return frames;
}
const delivery=await optionalJson(join(project,'delivery.json')),capture=await optionalJson(join(project,'capture-report.json'));
const snapshots=Array.isArray(delivery?.snapshots)&&delivery.snapshots.length?delivery.snapshots:Array.from({length:8},(_,index)=>(index+.5)*duration/8);
const clicks=(capture?.pointer??[]).filter(event=>event.type==='click').map(event=>event.start);
const clickBoundaries=clicks.length?clicks.flatMap(time=>[Math.max(0,time-.1),Math.min(duration-1/fps,time+.12)]):[0,Math.max(0,duration-1/fps)];
const contactSheet=join(renders,'contact-sheet.jpg'),clickSheet=join(renders,'click-boundaries.jpg');
const snapshotFrames=makeSheet(snapshots,contactSheet,snapshots.length>8?4:2),clickFrames=makeSheet(clickBoundaries,clickSheet,clickBoundaries.length>8?4:2);
const report={passed,codec:video?.codec_name,width:video?.width,height:video?.height,fps:video?.avg_frame_rate,frames:Number(video?.nb_frames),duration:Number(metadata.format.duration),bytes:Number(metadata.format.size),decoded:true,sha256:createHash('sha256').update(await readFile(path)).digest('hex'),review:{snapshotFrames,clickFrames,clickBoundaryPairs:clicks.length,contactSheet,clickBoundaries:clickSheet}};
await writeFile(path+'.verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!passed)process.exitCode=1;
