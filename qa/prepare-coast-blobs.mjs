// Prepare immutable Git blobs for review. This never creates a commit or moves a ref.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='TrentSterling/duderworld')throw Error('Unexpected repository');
const token=process.env.GITHUB_TOKEN;
if(!token)throw Error('GITHUB_TOKEN is required');
const out='output/coast-release';mkdirSync(out,{recursive:true});
const header='# DuderWorld Coast V0.5: compact visual study\n\n[Open the Coast preview](https://tront.xyz/duderworld/duderworld-coast-v0-5.html) | [Offline HTML](duderworld-coast-v0-5.html) | [Modeling, export and verification notes](docs/coast-v0-5.md)\n\nA separate Three.js art pass: a compact portal courtyard, recessed skatepark and low beach connected by supported bridges. One 128x128 palette atlas, two opaque materials, nine static scenery batches. Preview scale figures are not DuderLab rigs and are excluded from GLB. No Unity package, networking or gameplay was added. The existing V0.2/V0.3/V0.4 previews and the default studio remain unchanged.\n\nBuild with `npm run build:coast`; validate with `npm test`. See the notes for actual browser and GLB round-trip checks, rendering costs and limitations.\n\n---\n\n';
let readme=readFileSync('README.md','utf8');
if(!readme.startsWith('# DuderWorld Coast V0.5:'))readme=header+readme;
writeFileSync(`${out}/README.md`,readme);
copyFileSync('duderworld-coast-v0-5.html',`${out}/duderworld-coast-v0-5.html`);
const manifest={commit:process.env.GITHUB_SHA,files:{},sources:{}};
for(const [path,bytes] of [['duderworld-coast-v0-5.html',readFileSync('duderworld-coast-v0-5.html')],['README.md',Buffer.from(readme)]]){
  const response=await fetch(`https://api.github.com/repos/${repo}/git/blobs`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},
    body:JSON.stringify({content:bytes.toString('base64'),encoding:'base64'})
  });
  if(!response.ok)throw Error(`Blob creation failed: HTTP ${response.status}`);
  const result=await response.json();
  manifest.files[path]={blobSHA:result.sha,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}
const files=execFileSync('git',['ls-files','src','qa','build-coast.mjs','package.json','package-lock.json'],{encoding:'utf8'}).trim().split('\n');
for(const path of files){const bytes=readFileSync(path);manifest.sources[path]=createHash('sha256').update(bytes).digest('hex');}
writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.files,null,2));
