// Headless bake of the exact same Three.js BufferGeometry as static.html.
// Uses a minimal FileReader shim solely because Node doesn't expose that DOM API.
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildWorld} from '../src/world.mjs';
import {writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

if(!globalThis.FileReader)globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.({target:this});});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{
    this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.({target:this});
  });}
};

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,process.argv[2]||'duderworld-lobby-v0-2.glb');
const world=buildWorld();
const linearByte=x=>{const c=x/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);};
const build=data=>{
  const g=new THREE.BufferGeometry(),colors=new Float32Array(data.colors.length);
  for(let i=0;i<colors.length;i++)colors[i]=linearByte(data.colors[i]);
  g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
  g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  g.setIndex(new THREE.BufferAttribute(data.indices,1));return g;
};
const group=new THREE.Group();group.name='DuderWorld V0.2 / one unit per metre';
const solid=new THREE.Mesh(build(world.opaque),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0}));
solid.name='Static level - vertex colours';group.add(solid);
const glow=new THREE.Mesh(build(world.glow),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
glow.name='Portal panels';group.add(glow);
const buffer=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true});
writeFileSync(out,Buffer.from(buffer));

const bytes=readFileSync(out),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)throw Error('Not glTF 2.0 binary');
if(view.getUint32(8,true)!==bytes.length)throw Error('GLB byte count mismatch');
const jsonLength=view.getUint32(12,true),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
if(json.meshes?.length!==2)throw Error('Expected one solid mesh and one portal mesh');
let count=0;
for(const mesh of json.meshes)for(const primitive of mesh.primitives){
  for(const field of ['POSITION','NORMAL','COLOR_0'])if(primitive.attributes[field]===undefined)throw Error('Missing '+field);
  if(primitive.indices===undefined)throw Error('Expected indexed geometry');
  count+=json.accessors[primitive.indices].count/3;
}
if(count!==world.stats.triangles)throw Error(`GLB geometry mismatch: ${count} != ${world.stats.triangles}`);
if(json.buffers.some(x=>x.uri))throw Error('Expected self-contained GLB');
console.log(JSON.stringify({file:out,bytes:bytes.length,triangles:count,meshes:json.meshes.length,
  vertexAttributes:['POSITION','NORMAL','COLOR_0'],selfContained:true},null,2));
