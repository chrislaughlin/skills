import {readFile,stat} from 'node:fs/promises';
import {dirname,join,resolve,sep} from 'node:path';
import {platform,arch} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';

const [capturePath,projectPath]=process.argv.slice(2);
if(!capturePath||!projectPath)throw new Error('Usage: node scripts/deliver.mjs PASSED_CAPTURE_DIRECTORY NEW_REMOTION_PROJECT');

const capture=resolve(capturePath),project=resolve(projectPath),scripts=dirname(fileURLToPath(import.meta.url));
const report=JSON.parse(await readFile(join(capture,'report.json'),'utf8'));
if(report.status!=='passed'||report.assertions.some(assertion=>!assertion.pass))throw new Error('Refusing to deliver an unverified journey');

function run(command,args,options={}){
  const result=spawnSync(command,args,{stdio:'inherit',...options});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${command} failed with status ${result.status}`);
}
function playwrightHeadlessShell(){
 const full=chromium.executablePath(),escaped=sep==='\\'?'\\\\':'/',match=full.match(new RegExp(`^(.*)${escaped}chromium-(\\d+)${escaped}`));
 if(!match)return null;
 const folder=`chromium_headless_shell-${match[2]}`,os=platform();
 if(os==='darwin')return join(match[1],folder,`chrome-headless-shell-mac-${arch()==='arm64'?'arm64':'x64'}`,'chrome-headless-shell');
 if(os==='linux')return join(match[1],folder,'chrome-headless-shell-linux64','chrome-headless-shell');
 if(os==='win32')return join(match[1],folder,'chrome-headless-shell-win64','chrome-headless-shell.exe');
 return null;
}

run(process.execPath,[join(scripts,'compose.mjs'),capture,project]);
run('npm',['ci','--no-audit','--no-fund'],{cwd:project});
const renderArgs=['run','render','--','--log','error'],browserExecutable=playwrightHeadlessShell();
try{if(browserExecutable){await stat(browserExecutable);renderArgs.push('--browser-executable',browserExecutable);}}catch{}
run('npm',renderArgs,{cwd:project});
const delivery=JSON.parse(await readFile(join(project,'delivery.json'),'utf8'));
const video=join(project,'renders','video.mp4');
run(process.execPath,[join(scripts,'verify.mjs'),video,String(delivery.duration)]);
const verification=JSON.parse(await readFile(video+'.verification.json','utf8'));
const size=await stat(video);
console.log(JSON.stringify({
  passed:verification.passed,
  video,
  contactSheet:join(project,'renders','contact-sheet.jpg'),
  clickBoundaries:join(project,'renders','click-boundaries.jpg'),
  verificationReport:video+'.verification.json',
  duration:verification.duration,
  bytes:size.size
},null,2));
