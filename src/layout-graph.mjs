// DuderWorld V0.4 — deterministic, game-engine-neutral world layout graph.
// This file deliberately has no Three.js or DOM dependency.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PRESET=[
  ['skate','SKATE PARK',0,0,23.5,'skate'],
  ['friends','FRIENDS',-43,-26,14.2,'friends'],
  ['voice','VOICE',0,-46,14.2,'voice'],
  ['sessions','SESSIONS',43,-26,14.2,'sessions'],
  ['physics','PHYSICS',-43,28,14.7,'physics'],
  ['arcade','ARCADE',0,48,14.7,'arcade'],
  ['network','NET LAB',43,28,14.2,'network'],
];
const TEMPLATES=[['friends','FRIENDS',14.2],['voice','VOICE',14.2],
  ['sessions','SESSIONS',14.2],['physics','PHYSICS',14.7],
  ['arcade','ARCADE',14.7],['network','NET LAB',14.2]];
function rng(seed){let state=seed|0;return()=>{
  state=(Math.imul(state,1664525)+1013904223)|0;
  return (state>>>0)/4294967296;
};}
function finite(name,value){if(!Number.isFinite(value))throw Error('Invalid '+name);return value;}
export function normalizeLayoutRecipe(input={}){
  const islandCount=Math.round(clamp(finite('islandCount',input.islandCount??7),3,12));
  const spread=clamp(finite('spread',input.spread??1),.9,1.35);
  const variation=clamp(finite('variation',input.variation??0),0,1);
  const seed=finite('seed',input.seed??20261024)|0;
  const topology=['radial','ring','chain','hybrid'].includes(input.topology)?input.topology:'radial';
  return {version:4,seed,islandCount,spread,variation,topology};
}
export function generateLayoutGraph(recipe={}){
  const config=normalizeLayoutRecipe(recipe),n=config.islandCount-1,rnd=rng(config.seed);
  const nodes=[{id:'skate',name:'SKATE PARK',x:0,z:0,r:23.5,theme:'skate',index:0}];
  if(n===6&&config.variation===0){
    for(const [i,p] of PRESET.slice(1).entries())nodes.push({id:p[0],name:p[1],
      x:p[2]*config.spread,z:p[3]*config.spread,r:p[4],theme:p[5],index:i+1});
  }else{
    // Enough circumference to keep the island footprints separated even at 12 nodes.
    const radius=Math.max(51,(2*14.7+13)/(2*Math.sin(Math.PI/n)));
    for(let i=0;i<n;i++){
      const [theme,name,r]=TEMPLATES[i%TEMPLATES.length];
      const angle=-Math.PI/2+TAU*i/n+(rnd()-.5)*.065*config.variation;
      const d=radius*config.spread*(1+(rnd()-.5)*.08*config.variation);
      const suffix=i<6?'':` ${Math.floor(i/6)+1}`;
      nodes.push({id:i<6?theme:`${theme}-${i+1}`,name:name+suffix,
        x:Math.cos(angle)*d,z:Math.sin(angle)*d,r,theme,index:i+1});
    }
  }
  const edges=[];const used=new Set();
  function add(a,b){if(a===b)return;
    const id=[a,b].sort().join(':');if(used.has(id))return;used.add(id);
    edges.push({id:`bridge-${edges.length+1}`,from:a,to:b});}
  const outer=nodes.slice(1).map(s=>s.id);
  if(config.topology==='radial'||config.topology==='hybrid')for(const id of outer)add('skate',id);
  if(config.topology==='chain'){
    add('skate',outer[0]);for(let i=1;i<outer.length;i++)add(outer[i-1],outer[i]);
  }
  if(config.topology==='ring'||config.topology==='hybrid'){
    if(config.topology==='ring')add('skate',outer[0]);
    for(let i=0;i<outer.length;i++)add(outer[i],outer[(i+1)%outer.length]);
  }
  const byId=new Map(nodes.map(s=>[s.id,s]));
  const connections=Object.fromEntries(nodes.map(s=>[s.id,[]]));
  for(const e of edges){
    const a=byId.get(e.from),b=byId.get(e.to);
    e.length=Math.hypot(a.x-b.x,a.z-b.z);
    e.width=4.7;
    connections[a.id].push(b.id);connections[b.id].push(a.id);
  }
  // These are logical, *not rendered* props. Unity creates them as discrete
  // physics/network objects instead of baking them into the environment.
  const spawnPoints=nodes.flatMap(s=>[{
    id:`spawn-${s.id}`,kind:'player',island:s.id,
    position:[s.x,0.15,s.z+s.r*.30],forward:[0,0,-1]
  }]);
  const interactables=nodes.flatMap(s=>s.theme==='physics'?[{
    id:`toys-${s.id}`,island:s.id,kind:'physics-prop-spawner',
    position:[s.x,0,s.z],prefabTags:['cube','ball','seesaw']
  }]:[]);
  return {config,nodes,edges,connections,spawnPoints,interactables,
    coordinateSystem:{units:'meters',up:'Y',deckHeight:0},
    preset:'DuderWorld social archipelago'};
}
export function validateLayoutGraph(graph){
  const errors=[],byId=new Map(graph.nodes.map(s=>[s.id,s]));
  if(byId.size!==graph.nodes.length)errors.push('Duplicate node IDs');
  for(const s of graph.nodes)if(!Number.isFinite(s.x+s.z+s.r)||s.r<=0)errors.push(`Bad node ${s.id}`);
  const visited=new Set(),queue=[graph.nodes[0]?.id];
  while(queue.length){const id=queue.shift();if(!id||visited.has(id))continue;
    visited.add(id);queue.push(...(graph.connections[id]||[]));}
  if(visited.size!==graph.nodes.length)errors.push('Graph is disconnected');
  for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){
    const a=graph.nodes[i],b=graph.nodes[j];
    const d=Math.hypot(a.x-b.x,a.z-b.z);
    if(d<a.r+b.r+1)errors.push(`Overlapping islands ${a.id}/${b.id}`);
  }
  for(const e of graph.edges)if(!byId.has(e.from)||!byId.has(e.to)||!Number.isFinite(e.length))
    errors.push(`Invalid bridge ${e.id}`);
  return {ok:errors.length===0,errors,islands:graph.nodes.length,
    bridges:graph.edges.length,connected:visited.size===graph.nodes.length};
}
