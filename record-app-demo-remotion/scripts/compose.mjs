import {readFile,writeFile,mkdir,copyFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const [capturePath,projectPath]=process.argv.slice(2);
if(!capturePath||!projectPath)throw new Error('Usage: node scripts/compose.mjs CAPTURE_DIRECTORY NEW_REMOTION_PROJECT');
const capture=resolve(capturePath),project=resolve(projectPath),scripts=dirname(fileURLToPath(import.meta.url));
const report=JSON.parse(await readFile(join(capture,'report.json'),'utf8'));
if(report.status!=='passed'||report.assertions.some(a=>!a.pass))throw new Error('Refusing to compose an unverified journey');
await mkdir(project,{recursive:false});
const design=await mkdtemp(join(tmpdir(),'remotion-demo-design-'));
function run(script,args){const result=spawnSync(process.execPath,[join(scripts,script),...args],{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${script} failed with status ${result.status}`);}
try {
  // Build the same frozen visual design, then emit native React frame logic.
  // No HyperFrames CLI, runtime or installed skill is needed for this backend.
  run('build-design.mjs',[capture,design]);
  run('adapt-remotion.mjs',[design,project]);
  const template=resolve(scripts,'../assets/remotion-project');
  for(const file of ['package.json','package-lock.json'])await copyFile(join(template,file),join(project,file));
  for(const file of ['capture-report.json','delivery.json','STORYBOARD.md'])await copyFile(join(design,file),join(project,file));
  await writeFile(join(project,'.gitignore'),'node_modules/\n.remotion/\n');
} finally {await rm(design,{recursive:true,force:true});}
console.log(`Remotion project ready: ${project}. Run npm ci, then npm run render in that directory.`);
