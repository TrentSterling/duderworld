// Shared browser/CLI Unity handoff. The version-4 graph contract is retained;
// rooms are additive descriptors, not a claim of a finished Unity collider bake.
export function createWorldMetadata(world){
  const sites=world.metadata.islands;
  const collisionShapes=sites.map(s=>({id:'collision-'+s.id,island:s.id,
    kind:'cylinder',position:[s.x,-.25,s.z],radius:s.radius*.96,height:.5}));
  const navLinks=[];
  for(const e of world.metadata.bridges){
    const dx=e.toX-e.fromX,dz=e.toZ-e.fromZ,len=Math.hypot(dx,dz);
    collisionShapes.push({id:'collision-'+e.id,kind:'box',
      position:[(e.fromX+e.toX)/2,-.12,(e.fromZ+e.toZ)/2],
      size:[len+.8,.45,e.width],yawRadians:Math.atan2(-dz,dx)});
    navLinks.push({id:e.id,from:[e.fromX,.1,e.fromZ],to:[e.toX,.1,e.toZ],width:e.width,bidirectional:true});
  }
  return {format:'tront-eos.world-metadata',version:4,sourceBuild:'0.5.1',
    coordinateSystem:{units:'meters',up:'Y',deckHeight:0},recipe:world.config,
    islands:sites.map(s=>({...s,r:s.radius})),bridges:world.metadata.bridges.map(e=>{
      const a=sites.find(s=>s.id===e.from),b=sites.find(s=>s.id===e.to);
      return {...e,deckLength:e.length,centerDistance:Math.hypot(b.x-a.x,b.z-a.z)};
    }),
    adjacency:world.metadata.adjacency,spawnPoints:world.metadata.spawnPoints,
    interactables:world.metadata.interactables,rooms:world.metadata.rooms||[],
    collisionShapes,navLinks,bridgeLengthMeaning:'length and deckLength are deck spans; centerDistance is island-center distance',
    collisionNotes:'Island and bridge shapes are coarse proxies. Use the GLB for detailed bowl, ramp and room collision; room arcs describe navigation keepouts.'};
}
