import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {makeMaterials} from './coast-kit.mjs';
import {buildCoast,COAST_VERSION} from './coast-world.mjs';

const $=s=>document.querySelector(s),canvas=$('#view');
try {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c2dedd');
  const ambient=new THREE.HemisphereLight(0xe2f1ff,0x8b9680,1.7);scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xfff0d8,2.5);sun.position.set(-32,58,32);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-49;sun.shadow.camera.right=49;
  sun.shadow.camera.top=49;sun.shadow.camera.bottom=-49;sun.shadow.camera.near=.5;sun.shadow.camera.far=160;
  sun.shadow.bias=-.00006;sun.shadow.normalBias=.018;sun.shadow.radius=2.5;
  scene.add(sun,sun.target);
  const materials=makeMaterials(),world=buildCoast(materials);
  scene.add(world.root,world.crowd);
  const camera=new THREE.OrthographicCamera(-40,40,25,-25,.1,400);
  const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.dampingFactor=.14;
  orbit.minZoom=.45;orbit.maxZoom=5;orbit.maxPolarAngle=Math.PI*.49;
  orbit.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
  let extent=24.5,dirty=true,preset='all',wireframe=false;
  const presets={
    all:{target:[0,.3,0],offset:[24,64,68],extent:22.0},
    hub:{target:[0,1,-4],offset:[15,27,31],extent:13.5},
    skate:{target:[23,-.2,5],offset:[12,22,27],extent:12.0},
    beach:{target:[-22,-.7,10],offset:[10,20,26],extent:11.0},
    eye:{target:[0,2.2,-9],offset:[0,1.5,20],extent:8.5}
  };
  function setPreset(name){
    const p=presets[name];if(!p)throw Error('Unknown camera preset');preset=name;extent=p.extent;
    camera.zoom=1;orbit.target.fromArray(p.target);camera.position.fromArray(p.target).add(new THREE.Vector3(...p.offset));
    camera.lookAt(orbit.target);orbit.update();resize();
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  }
  function resize(){
    const w=innerWidth,h=innerHeight,aspect=w/h;renderer.setSize(w,h,false);
    const framedExtent=Math.max(extent,extent*1.45/aspect);
    camera.left=-framedExtent*aspect;camera.right=framedExtent*aspect;camera.top=framedExtent;camera.bottom=-framedExtent;
    camera.updateProjectionMatrix();dirty=true;
  }
  function saveBlob(data,name,type){
    const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  let exporting=false;
  async function exportGLB(download=true){
    if(exporting)throw Error('Export already running');exporting=true;
    $('#export').disabled=true;$('#status').textContent='Packing indexed meshes and shared atlas...';
    try{
      const data=await new GLTFExporter().parseAsync(world.root,{binary:true,onlyVisible:true});
      if(download)saveBlob(data,'duderworld-coast-v0-5.glb','model/gltf-binary');
      $('#status').textContent=`GLB: ${(data.byteLength/1048576).toFixed(2)} MiB; scenery + anchors, no preview figures.`;
      return data;
    }catch(e){$('#status').textContent='Export failed: '+e.message;throw e;}
    finally{exporting=false;$('#export').disabled=false;}
  }
  function figureVisibility(value){world.crowd.visible=value;renderer.shadowMap.needsUpdate=true;dirty=true;$('#figures').classList.toggle('active',value);}
  function toggleWire(){wireframe=!wireframe;materials.matte.wireframe=materials.hero.wireframe=wireframe;dirty=true;$('#wire').classList.toggle('active',wireframe);}
  for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setPreset(b.dataset.view);
  $('#export').onclick=()=>exportGLB().catch(console.error);
  $('#metadata').onclick=()=>saveBlob(JSON.stringify(world.metadata,null,2),'duderworld-coast-v0-5.json','application/json');
  $('#atlas').onclick=()=>materials.tex.image.toBlob(blob=>saveBlob(blob,'duderworld-palette-128.png','image/png'));
  $('#figures').onclick=()=>figureVisibility(!world.crowd.visible);
  $('#wire').onclick=toggleWire;
  $('#hide').onclick=()=>document.body.classList.toggle('clean');
  window.addEventListener('resize',resize);
  window.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea'))return;
    const views={'1':'all','2':'hub','3':'skate','4':'beach','5':'eye'};
    if(views[e.key])setPreset(views[e.key]);
    if(e.key.toLowerCase()==='h')document.body.classList.toggle('clean');
    if(e.key.toLowerCase()==='d')figureVisibility(!world.crowd.visible);
    if(e.key.toLowerCase()==='w')toggleWire();
  });
  orbit.addEventListener('change',()=>dirty=true);
  const statsText=`${world.stats.triangles.toLocaleString()} tris / ${world.stats.draws} scenery batches / 2 opaque materials / 128px atlas`;
  $('#stats').textContent=statsText;$('#version').textContent=COAST_VERSION;
  $('#status').textContent='Orbit: drag / Pan: right-drag / Zoom: wheel / 1-4: cameras / H: hide UI';
  setPreset(new URLSearchParams(location.search).get('camera')||'all');
  let frames=0;
  function frame(){
    orbit.update();
    if(dirty){renderer.render(scene,camera);dirty=false;frames++;}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Readable QA hooks use the actual rendered scene, never a substitute renderer.
  window.DuderWorld={version:COAST_VERSION,world,renderer,scene,camera,orbit,materials,
    setPreset,exportGLB,figureVisibility,requestRender(){dirty=true;},
    getReport(){return{version:COAST_VERSION,preset,frames,stats:world.stats,
      renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},
      opaque:[materials.matte,materials.hero].every(m=>!m.transparent&&m.opacity===1&&m.alphaTest===0),
      roughness:[materials.matte.roughness,materials.hero.roughness],previewFigures:world.crowd.visible,
      webgl:renderer.capabilities.isWebGL2,canvas:[canvas.width,canvas.height]};}
  };
  document.body.dataset.ready='true';
}catch(e){$('#status').textContent='Could not start: '+e.message;$('#status').classList.add('error');console.error(e);}
