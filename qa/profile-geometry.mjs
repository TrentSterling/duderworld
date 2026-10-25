// Instrument generator calls in a disposable bundle; production source is untouched.
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ref=process.argv[2]||'working',label=process.argv[3]||ref;
const out=path.join(root,'evidence','terrace');mkdirSync(out,{recursive:true});
const names=['roundedBox','roundedArc','leafBlade','ceramicPlanter','islandPalm','curvedStem',
 'lathe','ellipsoid','arcBand','socialPavilion','rim','shoreline','activityBackdrop','bridge',
 'bowlMesh','waterMesh','floorText','arrivalTerrace'];
globalThis.__geometryProfile={total:0,stack:[],functions:{}};
const outfile=path.join(out,`profile-${label}.mjs`);
await build({stdin:{contents:`import {MeshBucket} from './src/world.mjs';import {buildArchipelago} from './src/archipelago.mjs';
 const original=MeshBucket.prototype.tri;MeshBucket.prototype.tri=function(...a){const n=this.indices.length;original.apply(this,a);globalThis.__geometryProfile.total+=(this.indices.length-n)/3;};
 export const world=buildArchipelago();`,resolveDir:root,sourcefile:'profile-entry.mjs'},
 outfile,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'profile-generators',setup(b){
 b.onLoad({filter:/src[\\/].*\.mjs$/},args=>{
  const rel=path.relative(root,args.path).replaceAll('\\','/');
  let source=ref==='working'?readFileSync(args.path,'utf8'):execFileSync('git',['show',`${ref}:${rel}`],{cwd:root,encoding:'utf8'});
  for(const name of names){
   const re=new RegExp(`(export )?function ${name}\\(`);
   const match=source.match(re);if(!match)continue;
   source=source.replace(re,`function __profile_${name}(`);
   source+=`\n${match[1]||''}function ${name}(...args){const p=globalThis.__geometryProfile,before=p.total,frame={children:0};p.stack.push(frame);try{return __profile_${name}(...args);}finally{p.stack.pop();const inclusive=p.total-before,exclusive=inclusive-frame.children,key='${path.basename(rel)}:${name}',s=p.functions[key]||={calls:0,inclusive:0,exclusive:0};s.calls++;s.inclusive+=inclusive;s.exclusive+=exclusive;if(p.stack.length)p.stack.at(-1).children+=inclusive;}}\n`;
  }return {contents:source,loader:'js'};
 });}}]});
const {world}=await import(pathToFileURL(outfile));
const report={ref,stats:world.stats,functions:Object.entries(globalThis.__geometryProfile.functions).map(([name,s])=>({name,...s})).sort((a,b)=>b.exclusive-a.exclusive),chunks:world.chunks.map(c=>({name:c.name,triangles:(c.solid.indices.length+c.emissive.indices.length)/3,parts:c.solid.parts}))};
writeFileSync(path.join(out,`profile-${label}.json`),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
