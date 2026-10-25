// Investigation fixtures only. Never overwrites the reviewed offline viewer.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {build} from 'esbuild';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'evidence/perf-fixtures');
mkdirSync(resolve(out,'legacy'),{recursive:true});
for(const name of ['archipelago.mjs','world.mjs','layout-graph.mjs'])
  writeFileSync(resolve(out,'legacy',name),execFileSync('git',['show',`f204f2a:src/${name}`],{cwd:root}));
writeFileSync(resolve(out,'ablation.mjs'),`
import {buildArchipelago as current,DEFAULT_ARCHIPELAGO} from '../../src/archipelago.mjs';
import {buildArchipelago as legacy} from './legacy/archipelago.mjs';
export {DEFAULT_ARCHIPELAGO};
export function buildArchipelago(recipe){
 const world=current(recipe);
 if(new URLSearchParams(location.search).get('geometry')==='legacy-rooms'){
   const old=legacy(recipe);
   world.chunks=world.chunks.map(c=>['voice','friends'].includes(c.name)?old.chunks.find(o=>o.name===c.name):c);
   world.stats=world.chunks.reduce((s,c)=>{for(const d of [c.solid,c.emissive]){
    s.triangles+=d.indices.length/3;s.vertices+=d.positions.length/3;if(d.indices.length)s.meshes++;
   }return s;},{triangles:0,vertices:0,meshes:0});
 }
 return world;
}
`);
const source=readFileSync(resolve(root,'src/archipelago-viewer.js'),'utf8')
  .replace("from './archipelago.mjs'","from '../evidence/perf-fixtures/ablation.mjs'");
const result=await build({stdin:{contents:source,resolveDir:resolve(root,'src'),loader:'js'},bundle:true,format:'iife',target:'es2020',minify:true,write:false});
const html=readFileSync(resolve(root,'src/archipelago-template.html'),'utf8')
  .replace('/* INLINE_GENERATED_CODE */',()=>result.outputFiles[0].text.replaceAll('</script','<\\/script'));
writeFileSync(resolve(out,'candidate-ablation.html'),html);
console.log('Built investigation fixture:',resolve(out,'candidate-ablation.html'));
