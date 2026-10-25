// Optional check after qa/check-browser.py: compare expanded triangle attributes
// so an innocuous one-vertex weld difference cannot hide a changed surface.
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import assert from 'node:assert/strict';
async function meshes(path){const bytes=readFileSync(path),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const map=new Map();asset.scene.traverse(o=>{if(o.isMesh)map.set(o.name,o.geometry);});return map;}
const a=await meshes('duderworld-archipelago-v0-5-0.glb'),b=await meshes('evidence/art/browser-duderworld-archipelago-v0-5-0.glb');
const maximum={position:0,normal:0,color:0},worst={};assert.equal(a.size,b.size);
for(const [name,ga] of a){const gb=b.get(name);assert(gb,name);assert.equal(ga.index.count,gb.index.count);
 for(const attribute of Object.keys(maximum)){
  const aa=ga.attributes[attribute],bb=gb.attributes[attribute];assert(aa&&bb);assert.equal(aa.itemSize,bb.itemSize);
  for(let i=0;i<ga.index.count;i++)for(let k=0;k<aa.itemSize;k++){
   const delta=Math.abs(aa.array[ga.index.array[i]*aa.itemSize+k]-bb.array[gb.index.array[i]*bb.itemSize+k]);assert(Number.isFinite(delta),'Nonfinite triangle attribute');if(delta>maximum[attribute]){maximum[attribute]=delta;worst[attribute]={name,index:i,component:k,a:aa.array[ga.index.array[i]*aa.itemSize+k],b:bb.array[gb.index.array[i]*bb.itemSize+k]};}
  }
 }
}
assert(maximum.position<1e-4);assert(maximum.normal<1e-4);assert(maximum.color<1e-5);
console.log(JSON.stringify({pass:true,meshes:a.size,maximumExpandedTriangleAttributeDifference:maximum,worst,toleranceMeters:.0001}));
