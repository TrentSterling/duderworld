import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildArchipelago} from '../src/archipelago.mjs';
import {roomWalkable} from '../src/soft-architecture.mjs';

const recipes=[{},
  {islandCount:3,topology:'ring',detail:20},
  {islandCount:4,topology:'ring',detail:20},
  {islandCount:7,topology:'ring',detail:20,variation:.7},
  {islandCount:7,topology:'chain',detail:20,spread:.9},
  {islandCount:12,topology:'hybrid',detail:20,variation:1}];
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const reports=[];let rays=0,terraceRays=0;
for(const recipe of recipes){
  const world=buildArchipelago(recipe),report={recipe:world.config,rooms:world.metadata.rooms.length,checks:0};
  for(const room of world.metadata.rooms){
    const chunk=world.chunks.find(c=>c.name===room.island);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(chunk.solid.positions,3));
    geometry.setIndex(new THREE.BufferAttribute(chunk.solid.indices,1));
    const mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld();
    const [cx,,cz]=room.center;
    assert(room.minimumEntryClearance>4.7);
    assert(room.minimumSeatingClearance>=3.5);
    assert(room.canopyClearHeight>=3);
    assert(room.seatingArcs.every(([a0,a1])=>a1-a0>=.35),'Invisible short seat in navigation');
    if(room.island==='friends')assert(Math.abs(room.centerKeepout-1.36*.67)<1e-6,'Tea table footprint mismatch');
    assert(!roomWalkable([room],cx,cz),'Central furniture must block walk preview');
    // Sweep a real 3 m-wide corridor against the actual exported mesh, not
    // just metadata. Check standing waist and head heights in both lanes.
    for(const angle of room.entrances){
      const dx=Math.cos(angle),dz=Math.sin(angle);
      for(const lateral of [-1.5,-.75,0,.75,1.5])for(const y of [1.1,1.85]){
        const start=new THREE.Vector3(cx+dx*14.1-dz*lateral,y,cz+dz*14.1+dx*lateral);
        const ray=new THREE.Raycaster(start,new THREE.Vector3(-dx,0,-dz),0,10.1);
        const hits=ray.intersectObject(mesh,false);
        assert.equal(hits.length,0,`${room.island} ${world.config.topology} approach blocked at angle ${angle.toFixed(3)}, lane ${lateral}, y ${y}: distance ${hits[0]?.distance}`);
        rays++;
        for(let d=4;d<=13;d+=.25){
          assert(roomWalkable([room],cx+dx*d-dz*lateral,cz+dz*d+dx*lateral),`${room.island}: analytic nav blocks clear lane`);
        }
      }
    }
    // The new outlook keeps a 2 m-wide route to the parapet. Check actual
    // standing-height geometry as well as the conservative walk keepouts.
    if(room.terrace){
      const angle=room.terrace.angle,dx=Math.cos(angle),dz=Math.sin(angle);
      for(const lateral of [-1,0,1])for(const y of [1.1,1.85]){
        const start=new THREE.Vector3(cx+dx*4-dz*lateral,y,cz+dz*4+dx*lateral);
        const hits=new THREE.Raycaster(start,new THREE.Vector3(dx,0,dz),0,7.5).intersectObject(mesh,false);
        assert.equal(hits.length,0,`${room.island} terrace standing route blocked: ${world.config.topology}, lane ${lateral}, y ${y}`);
        for(let d=4;d<=11.5;d+=.25)assert(roomWalkable([room],cx+dx*d-dz*lateral,cz+dz*d+dx*lateral),`${room.island}: terrace walk route blocked`);
        terraceRays++;
      }
      for(const p of room.decorativeKeepouts.filter(p=>p.kind.startsWith('terrace-')||p.kind==='arrival-pier'))
        assert(!roomWalkable([room],p.x,p.z),'Assembly footprint must block walk preview');
    }
    for(let i=0;i<chunk.solid.normals.length;i+=3){
      const n=chunk.solid.normals;
      assert(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)<1e-5,'Nonunit normal');
    }
    geometry.dispose();report.checks++;
  }
  reports.push(report);
}
material.dispose();
console.log(JSON.stringify({pass:true,approachRaycasts:rays,clearLaneWidthMeters:3,terraceRaycasts:terraceRays,terraceLaneWidthMeters:2,recipes:reports},null,2));
