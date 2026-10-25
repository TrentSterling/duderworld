import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildWorld} from '../src/world.mjs';
import {buildArchipelago} from '../src/archipelago.mjs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../duderworld-v0-5-0.html',import.meta.url),'utf8');
const glb=readFileSync(new URL('../duderworld-lobby-v0-2.glb',import.meta.url));
assert.equal((html.match(/<script\b/g)||[]).length,1,'standalone uses one bundled script');
assert.ok(!/<(?:script|link)\b[^>]*(?:src|href)\s*=/i.test(html),'no dependent scripts/stylesheets');
assert.ok(html.includes('Copyright © 2010-2025 three.js authors'),'standalone includes MIT attribution');
assert.ok(html.includes('BAKE UNITY GLB')&&html.includes('TOP DOWN'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script?.length>400000,'Three.js and addons must be embedded');
new vm.Script(script,{filename:'static-inline.js'});
const src=readFileSync(new URL('../src/archipelago-viewer.js',import.meta.url),'utf8');
assert.match(src,/from 'three'/);assert.match(src,/GLTFExporter/);

const asset=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'');
let meshes=0,vertices=0,triangles=0;
asset.scene.traverse(o=>{
  if(!o.isMesh)return;
  meshes++;const geo=o.geometry;
  vertices+=geo.getAttribute('position').count;
  triangles+=geo.index.count/3;
  assert.equal(geo.getAttribute('normal').count,geo.getAttribute('position').count);
  assert.equal(geo.getAttribute('color').count,geo.getAttribute('position').count);
});
const expected=buildWorld();
assert.equal(meshes,2);assert.equal(triangles,expected.stats.triangles);assert.equal(vertices,expected.stats.vertices);
const report={pass:true,threeBundleBytes:Buffer.byteLength(html),glbBytes:glb.length,meshes,vertices,triangles,
  checks:['Three.js and GLTFExporter bundled with no URL dependency','full MIT notice included in standalone HTML',
    'bundled JavaScript parses','GLB round-tripped through Three.js GLTFLoader','indices/normals/COLOR_0 preserved']};
console.log(JSON.stringify(report,null,2));
const latest=readFileSync(new URL('../duderworld-archipelago-v0-5-0.glb',import.meta.url));
const roundtrip=await new GLTFLoader().parseAsync(latest.buffer.slice(latest.byteOffset,latest.byteOffset+latest.byteLength),'');
let latestTriangles=0,latestVertices=0,latestMeshes=0;
roundtrip.scene.traverse(o=>{if(!o.isMesh)return;latestMeshes++;latestTriangles+=o.geometry.index.count/3;
  latestVertices+=o.geometry.attributes.position.count;
  assert.equal(o.geometry.attributes.normal.count,o.geometry.attributes.position.count);
  assert.equal(o.geometry.attributes.color.count,o.geometry.attributes.position.count);});
const archipelago=buildArchipelago();
assert.equal(latestTriangles,archipelago.stats.triangles);assert.equal(latestVertices,archipelago.stats.vertices);assert.equal(latestMeshes,18);
console.log(JSON.stringify({pass:true,latestGLBRoundtrip:{triangles:latestTriangles,vertices:latestVertices,meshes:latestMeshes,bytes:latest.length}}));
