import {readFileSync,writeFileSync} from 'node:fs';
import {generateLayoutGraph,validateLayoutGraph} from '../src/layout-graph.mjs';
// node qa/export-world-metadata-v0-4.mjs [recipe.json] [output.json]
const input=process.argv[2]?JSON.parse(readFileSync(process.argv[2],'utf8')):{};
const graph=generateLayoutGraph(input.settings||input),check=validateLayoutGraph(graph);
if(!check.ok)throw Error(check.errors.join('; '));
const byId=new Map(graph.nodes.map(s=>[s.id,s]));
const collisionShapes=graph.nodes.map(s=>({id:'collider-'+s.id,kind:'cylinder',
  position:[s.x,-.25,s.z],radius:s.r*.95,height:.5}));
const navLinks=[];
for(const e of graph.edges){
  const a=byId.get(e.from),b=byId.get(e.to),dx=b.x-a.x,dz=b.z-a.z;
  const d=Math.hypot(dx,dz),ux=dx/d,uz=dz/d;
  const from=[a.x+ux*a.r*.96,.08,a.z+uz*a.r*.96];
  const to=[b.x-ux*b.r*.96,.08,b.z-uz*b.r*.96],len=Math.hypot(to[0]-from[0],to[2]-from[2]);
  collisionShapes.push({id:'collider-'+e.id,kind:'box',
    position:[(from[0]+to[0])/2,-.1,(from[2]+to[2])/2],
    size:[len+.85,.42,4.65],yawRadians:Math.atan2(-uz,ux)});
  navLinks.push({id:e.id,from,to,width:4.65,bidirectional:true});
}
const doc={format:'tront-eos.world-metadata',version:4,coordinateSystem:graph.coordinateSystem,
  recipe:graph.config,islands:graph.nodes,bridges:graph.edges,adjacency:graph.connections,
  spawnPoints:graph.spawnPoints,interactables:graph.interactables,collisionShapes,navLinks};
const out=JSON.stringify(doc,null,2)+'\n';
if(process.argv[3]){writeFileSync(process.argv[3],out);console.log('Wrote',process.argv[3]);}
else process.stdout.write(out);
