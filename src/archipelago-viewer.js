// DuderWorld Archipelago V0.5.1: original math meshes, browser preview,
// GLB export, overhead survey, and optional animated scale-reference duders.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildArchipelago,DEFAULT_ARCHIPELAGO} from './archipelago.mjs';
import {roomWalkable} from './soft-architecture.mjs';
import {createWorldMetadata} from './world-metadata.mjs';
import {createNPRMaterial} from './npr-material.mjs';
const TAU=Math.PI*2;

const canvas=document.querySelector('#screen');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.LinearToneMapping;
renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb5d7d4);
scene.fog=new THREE.Fog(0xb5d7d4,170,330);
scene.add(new THREE.HemisphereLight(0xfff1dc,0x8c91b8,1.45));
const sun=new THREE.DirectionalLight(0xfff0d8,1.72);
sun.position.set(-41,92,57);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-84;sun.shadow.camera.right=84;
sun.shadow.camera.top=84;sun.shadow.camera.bottom=-84;
sun.shadow.camera.far=230;sun.shadow.bias=-.0004;sun.shadow.normalBias=.07;
sun.shadow.radius=3;scene.add(sun,sun.target);
const sunOffset=new THREE.Vector3(-41,92,57),shadowDirection=sunOffset.clone().normalize();
const shadowRight=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),shadowDirection).normalize();
const shadowUp=new THREE.Vector3().crossVectors(shadowDirection,shadowRight).normalize();
const shadowFocus=new THREE.Vector3(),shadowCenter=new THREE.Vector3();
let shadowReach=84;
const perspective=new THREE.PerspectiveCamera(49,1,.10,650);
perspective.position.set(94,104,116);
const overhead=new THREE.OrthographicCamera(-100,100,100,-100,.1,650);
overhead.position.set(0,210,.001);
overhead.up.set(0,0,-1);overhead.lookAt(0,0,0);
const walkCamera=new THREE.PerspectiveCamera(72,1,.075,300);
const level=new THREE.Group();level.name='DuderWorld V0.5.1 / bakeable world geometry';
const crowdRoot=new THREE.Group();crowdRoot.name='Preview scale-reference duders - NOT EXPORTED';
scene.add(level,crowdRoot);

const linearByte=x=>{const c=x/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);};
const solidMat=createNPRMaterial();
const exportSolidMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.79,metalness:.015});
const waterMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.31,metalness:.08,side:THREE.DoubleSide});
const glowMat=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:THREE.DoubleSide});
const outlineMat=new THREE.MeshBasicMaterial({color:0x3f5463,side:THREE.BackSide,toneMapped:false});
const settings={...DEFAULT_ARCHIPELAGO};
let world=null,camera=perspective,controls=null,mode='orbit',
  outlines=false,avatars=true,exportRoot=new THREE.Group();
const animations={updating:false,people:[],meshes:[],parts:[],baseTime:0};
const keys=new Set(),player={position:new THREE.Vector3(0,1.90,16),yaw:Math.PI,pitch:-.04};

function makeGeometry(data){
  const g=new THREE.BufferGeometry(),color=new Float32Array(data.colors.length);
  for(let i=0;i<color.length;i++)color[i]=linearByte(data.colors[i]);
  g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
  g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  g.setAttribute('color',new THREE.BufferAttribute(color,3));
  g.setIndex(new THREE.BufferAttribute(data.positions.length/3<=65535?new Uint16Array(data.indices):data.indices,1));
  g.computeBoundingSphere();return g;
}
function expandedShell(geo,amount){
  const g=geo.clone(),p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++)p.setXYZ(i,
    p.getX(i)+n.getX(i)*amount,
    p.getY(i)+n.getY(i)*amount,
    p.getZ(i)+n.getZ(i)*amount);
  p.needsUpdate=true;g.computeBoundingSphere();return g;
}
function addOutlines(){
  for(const obj of [...level.children].filter(o=>o.userData.previewShell)){
    level.remove(obj);obj.geometry.dispose();
  }
  if(!outlines)return;
  for(const obj of level.children.filter(o=>o.isMesh&&o.userData.opaque&&o.userData.id!=='ocean')){
    const shell=new THREE.Mesh(expandedShell(obj.geometry,.036),outlineMat);
    shell.name=obj.name+' preview shell';shell.userData.previewShell=true;
    level.add(shell);
  }
}
function rebuild(){
  document.querySelector('#status').textContent='Generating recipe-driven archipelago...';
  const start=performance.now();
  for(const obj of [...level.children]){
    level.remove(obj);
    if(obj.userData.previewShell)obj.geometry.dispose();
    else obj.geometry.dispose();
  }
  world=buildArchipelago(settings);
  exportRoot=new THREE.Group();
  exportRoot.name='DuderWorld Archipelago recipe / meters / +Y up';
  for(const chunk of world.chunks){
    const islandNode=new THREE.Group(),bakeNode=new THREE.Group();
    islandNode.name=chunk.name;bakeNode.name=chunk.name;
    for(const [kind,data] of [['solid',chunk.solid],['emissive',chunk.emissive]]){
      if(!data.indices.length)continue;
      const geo=makeGeometry(data);
      const mat=kind==='emissive'?glowMat:chunk.name==='ocean'?waterMat:solidMat;
      const mesh=new THREE.Mesh(geo,mat);
      mesh.name=chunk.name+' / '+kind;
      mesh.userData.id=chunk.name;mesh.userData.opaque=kind==='solid';
      mesh.receiveShadow=chunk.name!=='ocean';
      mesh.castShadow=kind==='solid'&&chunk.name!=='ocean';
      level.add(mesh);
      // Same BufferGeometry in both groups. The hierarchy of the GLB encodes
      // island ownership, so Unity can generate per-island colliders/culling.
      const exported=new THREE.Mesh(geo,mat===solidMat?exportSolidMat:mat);
      exported.name=mesh.name;exported.castShadow=false;
      bakeNode.add(exported);
    }
    if(bakeNode.children.length)exportRoot.add(bakeNode);
  }
  addOutlines();
  buildCrowd();
  document.querySelector('#stats').textContent=
    world.metadata.islands.length+' islands · '+world.metadata.bridges.length+' bridges · '+
    world.stats.triangles.toLocaleString()+' triangles · '+
    world.stats.meshes+' material batches';
  document.querySelector('#status').textContent=
    'Geometry built in '+((performance.now()-start)/1000).toFixed(1)+'s · all original math meshes · GLB-ready';
  for(const [key,label] of [['islandCount','islandCountValue'],['spread','spreadValue'],['variation','variationValue'],['detail','detailValue'],['greenery','greeneryValue']]){
    document.querySelector('#'+key).value=settings[key];
    document.querySelector('#'+label).textContent=settings[key];
  }
  document.querySelector('#topology').value=settings.topology;
  resize();
}
function attachControls(){
  if(controls){controls.dispose();controls=null;}
  if(mode==='walk')return;
  controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.07;
  controls.target.set(0,-1,0);
  controls.minDistance=5;controls.maxDistance=320;
  controls.maxPolarAngle=Math.PI*.497;
  controls.mouseButtons={
    LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN
  };
  controls.update();
}
function setMode(next){
  if(document.pointerLockElement===canvas)document.exitPointerLock();
  mode=next;
  if(next==='overhead'){
    camera=overhead;overhead.position.set(0,210,.001);
    overhead.up.set(0,0,-1);overhead.zoom=1;overhead.updateProjectionMatrix();
  }else if(next==='walk'){
    camera=walkCamera;
    player.position.set(0,1.9,17);
    player.yaw=Math.PI;player.pitch=-.13;
    walkCamera.position.copy(player.position);
  }else{
    camera=perspective;
    perspective.position.set(94,104,116);
  }
  attachControls();
  document.querySelector('#view').textContent=next==='overhead'?'ORBIT 3D':'TOP DOWN';
  document.querySelector('#walk').textContent=next==='walk'?'EXIT WALK':'WALK / WASD';
  document.querySelector('#modeHint').textContent=next==='walk'?
    'Click anywhere to lock mouse · WASD moves · Shift runs · ESC releases mouse · 1 overhead':
    'Left drag orbit · Right drag pan · Scroll zoom · 1 overhead · 2 walk';
}
function saveBlob(data,name,type){
  const url=URL.createObjectURL(new Blob([data],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;
  link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
document.querySelector('#bake').onclick=async e=>{
  const button=e.currentTarget;button.disabled=true;button.textContent='EXPORTING...';
  try{
    const binary=await new GLTFExporter().parseAsync(exportRoot,{binary:true,onlyVisible:true});
    saveBlob(binary,'duderworld-archipelago-v0-5-1.glb','model/gltf-binary');
    document.querySelector('#status').textContent='Baked '+(binary.byteLength/1048576).toFixed(2)+
      ' MiB GLB · island groups, normals, colors, bridges and actual recessed bowls.';
  }catch(err){console.error(err);document.querySelector('#status').textContent='Export failed: '+err.message;}
  finally{button.disabled=false;button.textContent='BAKE UNITY GLB';}
};
// TrontEOS consumes semantic metadata separately from static render geometry.
document.querySelector('#metadata').onclick=()=>{
  const data=createWorldMetadata(world);
  saveBlob(JSON.stringify(data,null,2),'duderworld-v0-4.world.json','application/json');
};
document.querySelector('#recipe').onclick=()=>saveBlob(JSON.stringify({
  settings:world.config,metadata:world.metadata,stats:world.stats
},null,2),'duderworld-archipelago-v0-5-1.recipe.json','application/json');
document.querySelector('#view').onclick=()=>setMode(mode==='overhead'?'orbit':'overhead');
document.querySelector('#walk').onclick=()=>setMode(mode==='walk'?'orbit':'walk');
document.querySelector('#outlines').onclick=e=>{
  outlines=!outlines;addOutlines();
  e.currentTarget.textContent=outlines?'OUTLINES ON':'OUTLINES OFF';
};
document.querySelector('#avatars').onclick=e=>{
  avatars=!avatars;crowdRoot.visible=avatars;
  e.currentTarget.textContent=avatars?'DUDERS ON':'DUDERS OFF';
};
document.querySelector('#reroll').onclick=()=>{
  settings.seed=(Math.imul(settings.seed,1664525)+1013904223)|0;rebuild();
};
document.querySelector('#reset').onclick=()=>{
  Object.assign(settings,DEFAULT_ARCHIPELAGO);setMode('orbit');rebuild();
};
function focusSite(id){
  const site=world.metadata.islands.find(s=>s.id===id||s.theme===id);
  if(!site){setMode('orbit');return;}
  setMode('orbit');
  const room=world.metadata.rooms?.find(r=>r.island===site.id);
  const angle=(room?.entrances[0]??Math.atan2(-site.z,-site.x))-.30;
  const distance=id==='skate'?47:29;
  camera.position.set(site.x+Math.cos(angle)*distance,id==='skate'?30:18,site.z+Math.sin(angle)*distance);
  controls.target.set(site.x,1.5,site.z);controls.update();
}
document.querySelector('#focusVoice').onclick=()=>focusSite('voice');
document.querySelector('#focusFriends').onclick=()=>focusSite('friends');
document.querySelector('#focusSkate').onclick=()=>focusSite('skate');
document.querySelector('#focusWorld').onclick=()=>setMode('orbit');
document.querySelector('#topology').addEventListener('change',e=>{
  settings.topology=e.currentTarget.value;rebuild();
});
for(const name of ['islandCount','spread','variation','detail','greenery']){
  const input=document.querySelector('#'+name);
  input.addEventListener('input',()=>{
    document.querySelector('#'+name+'Value').textContent=Number(input.value);
  });
  input.addEventListener('change',()=>{settings[name]=Number(input.value);rebuild();});
}
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='Digit1'){setMode(mode==='overhead'?'orbit':'overhead');}
  else if(e.code==='Digit2'||e.code==='KeyF'){setMode(mode==='walk'?'orbit':'walk');}
  else if(e.code==='KeyO'){document.querySelector('#outlines').click();}
  else if(e.code==='KeyB'){document.querySelector('#bake').click();}
  else if(e.code==='KeyR'){document.querySelector('#reset').click();}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('click',()=>{if(mode==='walk'&&document.pointerLockElement!==canvas)
  canvas.requestPointerLock().catch(()=>{});});
document.addEventListener('mousemove',e=>{
  if(mode!=='walk'||document.pointerLockElement!==canvas)return;
  player.yaw-=e.movementX*.0021;
  player.pitch=Math.max(-1.42,Math.min(1.42,player.pitch-e.movementY*.0021));
});
function walkable(x,z){
  if(!roomWalkable(world.metadata.rooms||[],x,z))return false;
  if(world.metadata.islands.some(s=>Math.hypot(x-s.x,z-s.z)<s.radius*.96))return true;
  return world.metadata.bridges.some(b=>{
    const dx=b.toX-b.fromX,dz=b.toZ-b.fromZ;
    const t=Math.max(0,Math.min(1,((x-b.fromX)*dx+(z-b.fromZ)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-b.fromX-t*dx,z-b.fromZ-t*dz)<b.width*.46;
  });
}
function walk(dt){
  const front=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
  const right=new THREE.Vector3(-front.z,0,front.x);
  const movement=new THREE.Vector3();
  if(keys.has('KeyW'))movement.add(front);
  if(keys.has('KeyS'))movement.sub(front);
  if(keys.has('KeyD'))movement.add(right);
  if(keys.has('KeyA'))movement.sub(right);
  if(movement.lengthSq()>0)movement.normalize().multiplyScalar(dt*(keys.has('ShiftLeft')?10:5.6));
  const next=player.position.clone().add(movement);
  if(walkable(next.x,next.z)){
    player.position.x=next.x;player.position.z=next.z;
  }
  // Analytic skate-bowl foot placement; colliders for individual ramps are
  // intentionally left to Unity's mesh-collider bake.
  let floor=0;
  for(const basin of [
    {x:7.1,z:-3.5,rx:8.6,rz:7.9,depth:2.18},
    {x:-11.2,z:-8.4,rx:4.3,rz:4.05,depth:1.43}
  ]){
    const r=Math.hypot((player.position.x-basin.x)/basin.rx,
      (player.position.z-basin.z)/basin.rz);
    if(r<1.02){
      const smooth=r<.43?0:r<.62?.04:r<.73?.14:r<.83?.38:r<.94?.74:1;
      floor=Math.min(floor,-basin.depth*(1-smooth));
    }
  }
  player.position.y=THREE.MathUtils.damp(player.position.y,floor+1.9,9,dt);
  walkCamera.position.copy(player.position);
  walkCamera.rotation.order='YXZ';
  walkCamera.rotation.set(player.pitch,player.yaw,0);
}
// Small instanced duder ensemble is deliberately a viewport-only scale and
// social-animation reference, not EOS actors and not a physics-ragdoll claim.
const cPool=['#ffbc7e','#f58685','#ffe379','#58c9ce','#6acb9b','#a886e7','#4da0e6'];
function buildCrowd(){
  for(const obj of crowdRoot.children){obj.geometry.dispose();obj.material.dispose();}
  crowdRoot.clear();animations.people=[];animations.meshes=[];
  let n=0;
  const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)|0;return (n>>>0)/4294967296;};
  n=world.config.seed|0;
  for(const site of world.metadata.islands){
    const count=site.id==='skate'?18:7;
    const room=world.metadata.rooms?.some(r=>r.island===site.id);
    for(let k=0;k<count;k++){
      const angle=(k/count)*Math.PI*2+rnd()*.3;
      const radius=site.id==='skate'?13.8+rnd()*4.2:room?4.0+rnd()*.8:3.4+rnd()*4.7;
      const x=site.x+Math.cos(angle)*radius,z=site.z+Math.sin(angle)*radius;
      animations.people.push({
        island:site.id,k,site,x,z,radius,angle,phase:rnd()*TAU,
        color:cPool[Math.floor(rnd()*cPool.length)],
        behavior:site.id==='skate'?(k<5?'stunt':k<11?'skate':'idle'):
          k%5===0?'wave':k%5===1?'walk':'idle',
        hat:rnd()>.60
      });
    }
  }
  const count=animations.people.length;
  const spec=[
    {name:'bean',geometry:new THREE.SphereGeometry(.67,15,12),material:new THREE.MeshStandardMaterial({roughness:.63})},
    {name:'armL',geometry:new THREE.CapsuleGeometry(.145,.55,3,8),material:new THREE.MeshStandardMaterial({roughness:.74})},
    {name:'armR',geometry:new THREE.CapsuleGeometry(.145,.55,3,8),material:new THREE.MeshStandardMaterial({roughness:.74})},
    {name:'footL',geometry:new THREE.SphereGeometry(.23,9,6),material:new THREE.MeshStandardMaterial({roughness:.8})},
    {name:'footR',geometry:new THREE.SphereGeometry(.23,9,6),material:new THREE.MeshStandardMaterial({roughness:.8})},
    {name:'eyeL',geometry:new THREE.SphereGeometry(.092,9,6),material:new THREE.MeshStandardMaterial({color:0x1f3442,roughness:.8})},
    {name:'eyeR',geometry:new THREE.SphereGeometry(.092,9,6),material:new THREE.MeshStandardMaterial({color:0x1f3442,roughness:.8})},
    {name:'hat',geometry:new THREE.CylinderGeometry(.38,.51,.23,12),material:new THREE.MeshStandardMaterial({roughness:.72})},
    {name:'board',geometry:new THREE.BoxGeometry(1.28,.12,.39),material:new THREE.MeshStandardMaterial({roughness:.79})}
  ];
  animations.parts=[];
  for(let index=0;index<spec.length;index++){
    const s=spec[index],previousPair={2:1,4:3,6:5}[index];
    if(previousPair!==undefined){
      s.geometry.dispose();s.material.dispose();
      animations.parts.push({mesh:animations.parts[previousPair].mesh,offset:count});continue;
    }
    const paired=[1,3,5].includes(index);
    const mesh=new THREE.InstancedMesh(s.geometry,s.material,count*(paired?2:1));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
    mesh.name='Preview '+s.name;mesh.castShadow=s.name!=='eyeL'&&s.name!=='eyeR';
    mesh.receiveShadow=false;
    crowdRoot.add(mesh);animations.meshes.push(mesh);animations.parts.push({mesh,offset:0});
  }
  for(let i=0;i<count;i++){
    const color=new THREE.Color(animations.people[i].color);
    for(const m of animations.meshes)if(m.name!=='Preview eyeL'){
      m.setColorAt(i,color);if(m.count===count*2)m.setColorAt(i+count,color);
    }
  }
}
const rootPosition=new THREE.Vector3(),localPosition=new THREE.Vector3(),tmpPosition=new THREE.Vector3();
const rootQuat=new THREE.Quaternion(),localQuat=new THREE.Quaternion(),tmpQuat=new THREE.Quaternion();
const tmpScale=new THREE.Vector3(),temp=new THREE.Object3D();
function animateCrowd(seconds){
  if(!avatars)return;
  const list=animations.people,meshes=animations.meshes;
  for(let i=0;i<list.length;i++){
    const dude=list[i],time=seconds+dude.phase;
    let x=dude.x,z=dude.z,ground=0,pitch=0,roll=0,yaw=-dude.angle,board=false;
    let bob=Math.sin(time*2.2)*.065,step=Math.sin(time*3)*.17;
    if(dude.behavior==='stunt'){
      const a=time*.67+dude.k,rr=4.6+(dude.k%3)*1.65;
      x=7.1+Math.cos(a)*rr;z=-3.5+Math.sin(a)*rr;
      // Kinematic jump + tumbles signal intended physics, not simulated physics.
      const cycle=((time*.38+dude.k*.11)%1+1)%1;
      bob=Math.pow(Math.sin(Math.PI*cycle),2)*2.4;
      roll=cycle>.20&&cycle<.87?Math.PI*2*(cycle-.2)/.67:0;
      ground=-.86;
      yaw=-a;
      board=true;
    }else if(dude.behavior==='skate'){
      const a=dude.angle+time*.23;
      x=Math.cos(a)*dude.radius;z=Math.sin(a)*dude.radius;
      yaw=a+Math.PI*.5;
      bob=.14+Math.pow(Math.sin(time*1.3),8)*.38;
      roll=Math.sin(time*.6)*.16;board=true;
    }else if(dude.behavior==='walk'){
      const a=dude.angle+time*.12;
      x=dude.site.x+Math.cos(a)*dude.radius;
      z=dude.site.z+Math.sin(a)*dude.radius;
      yaw=a+Math.PI*.5;
      bob=Math.abs(Math.sin(time*5))*.09;
    }
    rootPosition.set(x,ground+1.03+bob,z);
    rootQuat.setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));
    const set=(index,point,rot=[0,0,0],scale=[1,1,1])=>{
      localPosition.set(...point);
      tmpPosition.copy(localPosition).applyQuaternion(rootQuat).add(rootPosition);
      localQuat.setFromEuler(new THREE.Euler(...rot));
      tmpQuat.copy(rootQuat).multiply(localQuat);
      tmpScale.set(...scale);
      temp.position.copy(tmpPosition);temp.quaternion.copy(tmpQuat);
      temp.scale.copy(tmpScale);temp.updateMatrix();
      const part=animations.parts[index];part.mesh.setMatrixAt(i+part.offset,temp.matrix);
    };
    set(0,[0,.08,0],[0,0,0],[1,1.18,.78]);
    const wave=dude.behavior==='wave'||(dude.behavior==='idle'&&dude.k%4===0);
    const armL=wave?-.55-Math.sin(time*5)*.20:.32+step*.25;
    const armR=wave?1.77+Math.sin(time*6)*.22:-.38-step*.25;
    set(1,[-.67,.16,0],[0,0,armL]);
    set(2,[.67,.16,0],[0,0,armR]);
    set(3,[-.30,-.78,-.12],[step,0,0],[1,1,.95]);
    set(4,[.30,-.78,-.12],[-step,0,0],[1,1,.95]);
    set(5,[-.236,.29,-.49],[0,0,0],[1,1,.75]);
    set(6,[.236,.29,-.49],[0,0,0],[1,1,.75]);
    set(7,[0,.93,0],[0,Math.sin(time*.6)*.1,0],dude.hat?[1,1,1]:[.0001,.0001,.0001]);
    set(8,[0,-1.05,0],[0,0,Math.sin(time*.4)*.06],
      board?[1,1,1]:[.0001,.0001,.0001]);
  }
  for(const m of meshes)m.instanceMatrix.needsUpdate=true;
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let lastHover=0;
canvas.addEventListener('pointermove',e=>{
  if(mode==='walk'||performance.now()-lastHover<150)return;
  lastHover=performance.now();
  const rect=canvas.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(level.children.filter(o=>
    o.isMesh&&o.userData.opaque&&o.userData.id!=='ocean'),false);
  const hit=hits.find(h=>h.object.userData.id!=='bridges');
  const id=hit?.object.userData.id;
  const loc=world.metadata.islands.find(s=>s.id===id);
  document.querySelector('#hover').textContent=loc?
    loc.name+' · '+loc.theme+' island · '+loc.radius.toFixed(0)+'m radius':'';
});
function resize(){
  const width=canvas.clientWidth,height=canvas.clientHeight;
  renderer.setSize(width,height,false);
  perspective.aspect=width/height;perspective.updateProjectionMatrix();
  walkCamera.aspect=width/height;walkCamera.updateProjectionMatrix();
  const reach=world?Math.max(92,...world.metadata.islands.map(s=>Math.hypot(s.x,s.z)+s.radius+8)):92;
  overhead.left=-reach*width/height;overhead.right=reach*width/height;
  overhead.top=reach;overhead.bottom=-reach;overhead.updateProjectionMatrix();
}
function frameShadows(){
  // Spend the fixed shadow texture on the inspected space, instead of mapping
  // all seven islands into it during an interior view. Snap in light space to
  // keep stationary surfaces stable while orbiting/panning.
  shadowFocus.copy(mode==='walk'?player.position:controls.target);shadowFocus.y=0;
  const worldReach=Math.max(84,...world.metadata.islands.map(s=>Math.hypot(s.x,s.z)+s.radius+8));
  const desired=mode==='walk'?26:Math.ceil(camera.position.distanceTo(shadowFocus)*.7/2)*2;
  const reach=mode==='overhead'?worldReach:Math.max(24,Math.min(worldReach,desired));
  if(reach!==shadowReach){
    shadowReach=reach;Object.assign(sun.shadow.camera,{left:-reach,right:reach,top:reach,bottom:-reach});
    sun.shadow.camera.updateProjectionMatrix();
  }
  const texel=2*reach/sun.shadow.mapSize.x;
  shadowCenter.copy(shadowRight).multiplyScalar(Math.round(shadowFocus.dot(shadowRight)/texel)*texel)
    .addScaledVector(shadowUp,Math.round(shadowFocus.dot(shadowUp)/texel)*texel)
    .addScaledVector(shadowDirection,shadowFocus.dot(shadowDirection));
  sun.target.position.copy(shadowCenter);sun.position.copy(shadowCenter).add(sunOffset);
}
window.addEventListener('resize',resize);
let prev=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min((now-prev)/1000,.08);prev=now;
  if(mode==='walk')walk(dt);
  else controls?.update();
  animateCrowd(animations.captureTime??now*.001);
  frameShadows();
  renderer.render(scene,camera);
}
  setMode('orbit');resize();rebuild();focusSite('voice');
// Deterministic inspection API: no input injection or pointer lock is needed.
window.__duderworld={world:()=>world,scene,level,renderer,exportRoot:()=>exportRoot,
  view(position,target){setMode('orbit');camera.position.set(...position);
    controls.target.set(...target);controls.update();},
  configure(recipe){Object.assign(settings,recipe);rebuild();},
  crowd(visible){avatars=visible;crowdRoot.visible=visible;},
  setMode,walkable,focusSite,metadata:()=>createWorldMetadata(world),
  time(seconds){animations.captureTime=seconds;},
  async exportGLB(){return new GLTFExporter().parseAsync(exportRoot,{binary:true,onlyVisible:true});}
};
requestAnimationFrame(frame);
