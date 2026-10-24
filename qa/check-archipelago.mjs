// Geometry contract: exact connected bridge graph, matching array lengths,
// valid triangle orientation and genuine holes in the skate surface.
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildArchipelago} from '../src/archipelago.mjs';
const world=buildArchipelago();
assert.equal(world.metadata.islands.length,7);
assert.equal(world.metadata.bridges.length,6);
assert.equal(new Set(world.metadata.islands.map(s=>s.id)).size,7);
for(const edge of world.metadata.bridges){
  assert.equal(edge.from,'skate');
  assert(edge.length>7&&edge.length<39,edge.to+' length: '+edge.length);
  assert(edge.width>4.0);
  const a=world.metadata.islands.find(s=>s.id===edge.from);
  const b=world.metadata.islands.find(s=>s.id===edge.to);
  assert(a&&b);
  assert(Math.hypot(edge.fromX-a.x,edge.fromZ-a.z)<a.radius);
  assert(Math.hypot(edge.toX-b.x,edge.toZ-b.z)<b.radius);
}
let triangles=0,vertices=0,bad=0,zero=0;
const digest=createHash('sha256');
for(const chunk of world.chunks){
  for(const data of [chunk.solid,chunk.emissive]){
    assert.equal(data.positions.length,data.normals.length);
    assert.equal(data.positions.length,data.colors.length);
    assert.equal(data.positions.length%3,0);
    assert.equal(data.indices.length%3,0);
    for(const arr of [data.positions,data.normals,data.colors,data.indices])
      digest.update(new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength));
    const v=data.positions.length/3;vertices+=v;triangles+=data.indices.length/3;
    for(let j=0;j<data.positions.length;j++){
      assert(Number.isFinite(data.positions[j]));
      assert(Number.isFinite(data.normals[j]));
    }
    for(let i=0;i<data.indices.length;i+=3){
      const a=data.indices[i],b=data.indices[i+1],c=data.indices[i+2];
      assert(a<v&&b<v&&c<v,'Index out of bounds for '+chunk.name);
      const p=data.positions,n=data.normals;
      const ab=[p[3*b]-p[3*a],p[3*b+1]-p[3*a+1],p[3*b+2]-p[3*a+2]];
      const ac=[p[3*c]-p[3*a],p[3*c+1]-p[3*a+1],p[3*c+2]-p[3*a+2]];
      const face=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      const mag=Math.hypot(...face);
      if(mag<1e-9){zero++;continue;}
      const normal=[n[3*a]+n[3*b]+n[3*c],n[3*a+1]+n[3*b+1]+n[3*c+1],
        n[3*a+2]+n[3*b+2]+n[3*c+2]];
      if(face[0]*normal[0]+face[1]*normal[1]+face[2]*normal[2]<-1e-6)bad++;
    }
  }
}
assert.equal(bad,0,'Triangles backface their own averaged normal');
assert.equal(zero,0,'Degenerate indexed triangles');
assert.equal(vertices,world.stats.vertices);
assert.equal(triangles,world.stats.triangles);
const main=world.chunks.find(c=>c.name==='skate');
const topPositions=main.solid.positions,topIndices=main.solid.indices;
for(const bowl of [[7.1,-3.5,8.6,7.9],[-11.2,-8.4,4.3,4.05]]){
  let blocking=0;
  for(let i=0;i<topIndices.length;i+=3){
    const ids=[topIndices[i],topIndices[i+1],topIndices[i+2]];
    if(!ids.every(k=>Math.abs(topPositions[3*k+1])<.0001))continue;
    const x=ids.reduce((s,k)=>s+topPositions[3*k],0)/3;
    const z=ids.reduce((s,k)=>s+topPositions[3*k+2],0)/3;
    if(Math.hypot((x-bowl[0])/bowl[2],(z-bowl[1])/bowl[3])<.22)blocking++;
  }
  assert.equal(blocking,0,'Top deck blocks bowl center');
}
const low=buildArchipelago({detail:20,greenery:.25});
assert(low.stats.triangles<world.stats.triangles,'Detail recipe not taking effect');
console.log(JSON.stringify({pass:true,triangles,vertices,meshes:world.stats.meshes,
  windingErrors:bad,degenerates:zero,bridges:world.metadata.bridges.length,
  bowlOpenings:2,lowDetailTriangles:low.stats.triangles,
  sha256:digest.digest('hex')},null,2));
