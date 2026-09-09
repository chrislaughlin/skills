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
const report={passed,codec:video?.codec_name,width:video?.width,height:video?.height,fps:video?.avg_frame_rate,frames:Number(video?.nb_frames),duration:Number(metadata.format.duration),bytes:Number(metadata.format.size),decoded:true,sha256:createHash('sha256').update(await readFile(path)).digest('hex')};
await writeFile(path+'.verification.json',JSON.stringify(report,null,2)+'\n');
run(['ffmpeg','-y','-v','error','-i',path,'-vf',`fps=${8/duration},scale=640:360,tile=2x4`,'-frames:v','1','-q:v','2',join(dirname(path),'contact-sheet.jpg')]);
console.log(JSON.stringify(report,null,2));if(!passed)process.exitCode=1;
