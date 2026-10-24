// DuderWorld V0.2 — architectural geometry study and portable GLB bake.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildWorld,DEFAULT_RECIPE} from './world.mjs';

const canvas=document.querySelector('#screen');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#eff3ed');scene.fog=new THREE.Fog('#eff3ed',70,120);
scene.add(new THREE.HemisphereLight(0xfffaf5,0xb7c5cd,1.2));
const sun=new THREE.DirectionalLight(0xffffff,2.0);sun.position.set(-13,35,18);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;
sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.camera.far=85;
sun.shadow.bias=-.00018;sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun,sun.target);
for(const [x,color] of [[-13.6,0xffc760],[13.6,0xc18aff]]){
  const light=new THREE.PointLight(color,46,12,2);light.position.set(x,2.8,4.7);scene.add(light);
}
const perspective=new THREE.PerspectiveCamera(48,1,.1,180);
perspective.position.set(24,30,-25);perspective.lookAt(0,0,0);
const overhead=new THREE.OrthographicCamera(-25,25,16,-16,.1,180);
overhead.position.set(0,55,.001);overhead.up.set(0,0,1);overhead.lookAt(0,0,0);
let camera=perspective,controls,topdown=false,showOutline=false;
function attachControls(){if(controls)controls.dispose();controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.07;controls.target.set(0,1.05,0);
  controls.minDistance=11;controls.maxDistance=93;controls.maxPolarAngle=Math.PI*.495;
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.update();
}attachControls();

const solidMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0});
const glowMat=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:THREE.DoubleSide});
const outlineMat=new THREE.MeshBasicMaterial({color:0x364b55,side:THREE.BackSide,toneMapped:false});
const group=new THREE.Group();group.name='DuderWorld procedurally generated geometry';scene.add(group);
let exportRoot=new THREE.Group(),world;
const settings={...DEFAULT_RECIPE},sliders={width:document.querySelector('#width'),depth:document.querySelector('#depth'),
  plaza:document.querySelector('#plaza'),facets:document.querySelector('#facets')};
const linearByte=x=>{const c=x/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);};
function makeGeometry(data){const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
  geo.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  const linear=new Float32Array(data.colors.length);for(let i=0;i<linear.length;i++)linear[i]=linearByte(data.colors[i]);
  geo.setAttribute('color',new THREE.BufferAttribute(linear,3));
  geo.setIndex(new THREE.BufferAttribute(data.indices,1));geo.computeBoundingSphere();return geo;
}
function expandedShell(geo,amount){const shell=geo.clone(),p=shell.attributes.position,n=shell.attributes.normal;
  for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*amount,p.getY(i)+n.getY(i)*amount,p.getZ(i)+n.getZ(i)*amount);
  p.needsUpdate=true;shell.computeBoundingSphere();return shell;
}
function rebuild(){for(const obj of [...group.children]){group.remove(obj);if(obj.name==='Preview shell')obj.geometry.dispose();}
  if(world){exportRoot.children.forEach(o=>o.geometry.dispose());}
  world=buildWorld(settings);const a=makeGeometry(world.opaque),b=makeGeometry(world.glow);
  const mesh=new THREE.Mesh(a,solidMat);mesh.name='Static level';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  const portal=new THREE.Mesh(b,glowMat);portal.name='Portal panels';group.add(portal);
  const outline=new THREE.Mesh(expandedShell(a,.031),outlineMat);outline.name='Preview shell';outline.visible=showOutline;group.add(outline);
  // Only original geometry is exported, never duplicate inflated outline triangles.
  exportRoot=new THREE.Group();exportRoot.name='DuderWorld V0.2 / one unit per metre';
  const bakedSolid=new THREE.Mesh(a,solidMat);bakedSolid.name='Static level - vertex colours';
  const bakedGlow=new THREE.Mesh(b,glowMat);bakedGlow.name='Portal panels';exportRoot.add(bakedSolid,bakedGlow);
  document.querySelector('#stats').textContent=`${world.stats.triangles.toLocaleString()} triangles · ${world.stats.vertices.toLocaleString()} indexed vertices · 2 mesh batches`;
  for(const [name,input] of Object.entries(sliders)){const value=settings[name==='plaza'?'plazaRadius':name];
    input.value=value;document.querySelector('#'+name+'Value').textContent=value;}
}
for(const [name,input] of Object.entries(sliders))input.addEventListener('input',()=>{
  settings[name==='plaza'?'plazaRadius':name]=Number(input.value);rebuild();
});
function topView(next){topdown=next;camera=next?overhead:perspective;
  if(next){overhead.position.set(0,55,.001);overhead.up.set(0,0,1);overhead.zoom=1;overhead.updateProjectionMatrix();}
  attachControls();document.querySelector('#view').textContent=next?'3D VIEW':'TOP DOWN';}
document.querySelector('#view').onclick=()=>topView(!topdown);
document.querySelector('#outline').onclick=()=>{showOutline=!showOutline;group.getObjectByName('Preview shell').visible=showOutline;
  document.querySelector('#outline').textContent=showOutline?'OUTLINES ON':'OUTLINES OFF';};
function reset(){Object.assign(settings,DEFAULT_RECIPE);camera=perspective;perspective.position.set(24,30,-25);
  topdown=false;attachControls();document.querySelector('#view').textContent='TOP DOWN';rebuild();}
document.querySelector('#reset').onclick=reset;
document.querySelector('#reroll').onclick=()=>{settings.seed=(Math.imul(settings.seed,1664525)+1013904223)|0;rebuild();};
function download(bytes,filename,mime){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
document.querySelector('#recipe').onclick=()=>download(JSON.stringify(world.config,null,2),'duderworld-lobby-recipe.json','application/json');
const bakeButton=document.querySelector('#bake');
bakeButton.onclick=async()=>{bakeButton.disabled=true;bakeButton.textContent='BAKING...';
  try{const glb=await new GLTFExporter().parseAsync(exportRoot,{binary:true,onlyVisible:true});
    download(glb,'duderworld-lobby-v0-2.glb','model/gltf-binary');
    document.querySelector('#status').textContent=`Baked ${(glb.byteLength/1024).toFixed(0)} KiB GLB with normals and vertex colors.`;
  }catch(err){console.error(err);document.querySelector('#status').textContent='Bake error: '+err.message;}
  finally{bakeButton.disabled=false;bakeButton.textContent='BAKE GLB';}
};
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;
  if(e.key.toLowerCase()==='t')topView(!topdown);
  if(e.key.toLowerCase()==='o')document.querySelector('#outline').click();
  if(e.key.toLowerCase()==='r')reset();
  if(e.key.toLowerCase()==='b')bakeButton.click();
});
function resize(){const width=canvas.clientWidth,height=canvas.clientHeight;renderer.setSize(width,height,false);
  perspective.aspect=width/height;perspective.updateProjectionMatrix();
  overhead.left=-16*width/height;overhead.right=16*width/height;
  overhead.top=16;overhead.bottom=-16;overhead.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();rebuild();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
