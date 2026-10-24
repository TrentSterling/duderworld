// Native headless bake of the same island batches shown in the viewer.
// Parses the resulting glTF 2.0 binary and checks topology attributes.
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildArchipelago} from '../src/archipelago.mjs';
import {writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
if(!globalThis.FileReader)globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{
    this.result=result;this.onloadend?.({target:this});});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{
    this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');
    this.onloadend?.({target:this});});}
};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const path=resolve(root,process.argv[2]||'duderworld-archipelago-v0-3.glb');
const world=buildArchipelago();
const linearByte=x=>{let c=x/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);};
function geo(data){
  const g=new THREE.BufferGeometry(),colors=new Float32Array(data.colors.length);
  for(let i=0;i<colors.length;i++)colors[i]=linearByte(data.colors[i]);
  g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
  g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  g.setIndex(new THREE.BufferAttribute(data.indices,1));return g;
}
const base=new THREE.Group();
base.name='DuderWorld Archipelago V0.3 / meters / +Y up';
let count=0;
for(const chunk of world.chunks){
  const node=new THREE.Group();node.name=chunk.name;
  for(const [name,values] of [['solid',chunk.solid],['emissive',chunk.emissive]]){
    if(!values.indices.length)continue;
    const mat=name==='emissive'?
      new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}):
      new THREE.MeshStandardMaterial({vertexColors:true,roughness:.79,metalness:0});
    const m=new THREE.Mesh(geo(values),mat);m.name=chunk.name+' / '+name;
    node.add(m);count++;
  }
  if(node.children.length)base.add(node);
}
const array=await new GLTFExporter().parseAsync(base,{binary:true,onlyVisible:true});
writeFileSync(path,Buffer.from(array));
const bytes=readFileSync(path),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)
  throw Error('Not a GLB version 2');
if(view.getUint32(8,true)!==bytes.length)throw Error('GLB length mismatch');
const jsonLength=view.getUint32(12,true);
const json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
if(json.meshes.length!==count)throw Error('Baked meshes missing');
let triangles=0;
for(const mesh of json.meshes)for(const p of mesh.primitives){
  for(const field of ['POSITION','NORMAL','COLOR_0'])
    if(p.attributes[field]===undefined)throw Error('Missing '+field);
  if(p.indices===undefined)throw Error('Missing indexed triangles');
  triangles+=json.accessors[p.indices].count/3;
}
if(triangles!==world.stats.triangles)
  throw Error('Triangle count mismatch '+triangles+' != '+world.stats.triangles);
if(json.buffers.some(b=>b.uri))throw Error('External binary buffer; expected standalone');
const names=json.nodes.map(n=>n.name);
for(const site of world.metadata.islands)
  if(!names.includes(site.id))throw Error('Missing island node '+site.id);
if(!names.includes('bridges'))throw Error('Missing bridge node');
console.log(JSON.stringify({path,bytes:bytes.length,triangles,meshes:json.meshes.length,
  groups:base.children.map(x=>x.name),islands:world.metadata.islands.length,
  bridges:world.metadata.bridges.length,attributes:['POSITION','NORMAL','COLOR_0'],
  indexed:true,selfContained:true},null,2));
