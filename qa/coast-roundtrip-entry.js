import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
window.verifyCoastRoundTrip=async function(){
  const w=window.DuderWorld;
  const bytes=await w.exportGLB(false);
  const doc=await new GLTFLoader().parseAsync(bytes,'');
  const source=new Map(),loaded=new Map();
  w.world.root.traverse(o=>{if(o.isMesh)source.set(o.name,o);});
  doc.scene.traverse(o=>{if(o.isMesh)loaded.set(o.name,o);});
  if(source.size!==loaded.size)throw Error('Mesh count changed on roundtrip');
  let maxDifference=0;
  for(const [name,mesh] of source){
    const other=loaded.get(name.replaceAll('.','')); // Loader sanitizes node names.
    const direct=loaded.get(name)||other;
    if(!direct)throw Error('Missing roundtrip mesh '+name+'; got '+[...loaded.keys()].join(','));
    for(const key of ['position','normal','uv']){
      const a=mesh.geometry.attributes[key].array,b=direct.geometry.attributes[key].array;
      if(a.length!==b.length)throw Error('Attribute length changed: '+key);
      for(let i=0;i<a.length;i++)maxDifference=Math.max(maxDifference,Math.abs(a[i]-b[i]));
    }
    if(mesh.geometry.index.count!==direct.geometry.index.count)throw Error('Triangle count changed');
    for(let i=0;i<mesh.geometry.index.count;i++)if(mesh.geometry.index.getX(i)!==direct.geometry.index.getX(i))throw Error('Indices changed');
    if(direct.material.transparent||direct.material.opacity!==1)throw Error('Transparent export');
  }
  const json=doc.parser.json;
  if(json.materials.length!==2)throw Error('Expected two materials');
  if(json.images.length!==1)throw Error('Atlas duplicated');
  if(json.materials.some(m=>m.alphaMode&&m.alphaMode!=='OPAQUE'))throw Error('Non-opaque alpha mode');
  if(json.nodes.some(n=>(n.name||'').includes('preview_scale')))throw Error('Preview crowd leaked into export');
  window.__roundTrippedCoast=doc.scene;
  return {pass:true,bytes:bytes.byteLength,meshes:loaded.size,materials:json.materials.length,images:json.images.length,
    indicesAndAttributesPreserved:maxDifference<1e-6,maxAttributeDifference:maxDifference,
    opaque:true,embeddedImage:json.images[0].bufferView!==undefined,
    anchorNames:json.nodes.filter(n=>(n.name||'').includes('Spawn')||(n.name||'').includes('Portal')).map(n=>n.name)};
};
