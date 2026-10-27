// Coast 0.5.2: solid botanical models and authored offshore rock gardens.
// All surfaces use the existing matte atlas. No alpha cards, extra materials,
// texture downloads, runtime animation or changes to the circulation layout.
import * as THREE from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {TAU,geometry,cylinder,ellipsoid,bar,slab,seeded} from './coast-kit.mjs';
const lerp=THREE.MathUtils.lerp;
const V=p=>new THREE.Vector3(...p);
const identity=[0,0,0],unit=[1,1,1];
function add(b,g,c,label){b.add(g,c,identity,identity,unit,false,label);}

// A tapered, curved, closed lens. Shared ring normals create a rounded leaf
// with a raised midrib instead of an ellipsoid or a flat triangular card.
export function solidLeaf(b,base,yaw,length,width,rise,droop,color,steps=5,thickness=.16){
  const d=[Math.cos(yaw),Math.sin(yaw)],side=[-d[1],d[0]],v=[],ix=[];
  for(let j=0;j<=steps;j++){
    const t=j/steps,shape=Math.pow(Math.sin(Math.PI*t),.78);
    const w=width*(.025+.975*shape),h=width*thickness*(.06+.94*shape);
    const y=base[1]+rise*Math.sin(t*Math.PI*.5)-droop*t*t;
    for(const [s,hh] of [[-1,0],[0,h],[1,0],[0,-h*.62]])
      v.push([base[0]+d[0]*length*t+side[0]*w*s,y+hh,base[2]+d[1]*length*t+side[1]*w*s]);
  }
  for(let j=0;j<steps;j++)for(let k=0;k<4;k++){
    const a=j*4+k,c=j*4+(k+1)%4;ix.push(a,c,c+4,a,c+4,a+4);
  }
  // Outward caps; nonzero terminal widths avoid zero-area tip triangles.
  ix.push(0,2,1,0,3,2);
  const e=steps*4;ix.push(e,e+1,e+2,e,e+2,e+3);
  const raw=geometry(v,ix),g=toCreasedNormals(raw,.80);raw.dispose();
  add(b,g,color,'botany: solid curved leaf');
}

// Sweep an elliptical cross-section along a modeled center line. Radii taper
// at both ends; the rings follow local tangents rather than staying horizontal.
function taperedStem(b,points,r0,r1,color,label='botany: tapered stem',sides=7){
  const v=[],ix=[],travel=V(points.at(-1)).sub(V(points[0]));
  const reference=new THREE.Vector3(-travel.z,0,travel.x);
  if(reference.lengthSq()<1e-10)reference.set(1,0,0);else reference.normalize();
  for(let j=0;j<points.length;j++){
    const tangent=V(points[Math.min(points.length-1,j+1)]).sub(V(points[Math.max(0,j-1)])).normalize();
    const side=reference.clone().addScaledVector(tangent,-reference.dot(tangent)).normalize();
    const front=new THREE.Vector3().crossVectors(tangent,side).normalize();
    const r=lerp(r0,r1,j/(points.length-1));
    for(let k=0;k<sides;k++)v.push(V(points[j]).addScaledVector(side,Math.cos(k*TAU/sides)*r).addScaledVector(front,Math.sin(k*TAU/sides)*r).toArray());
  }
  for(let j=0;j<points.length-1;j++)for(let k=0;k<sides;k++){
    const a=j*sides+k,c=j*sides+(k+1)%sides;ix.push(a,c,c+sides,a,c+sides,a+sides);
  }
  const first=v.length;v.push(points[0]);const last=v.length;v.push(points.at(-1));
  for(let k=0;k<sides;k++){const n=(k+1)%sides;ix.push(first,n,k);const a=(points.length-1)*sides;ix.push(last,a+k,a+n);}
  add(b,geometry(v,ix),color,label);
}

export function rosette(b,x,y,z,s=.5,angle=0,variant=0){
  const colors=variant%3===0?['leafDark','leaf','leafLight']:variant%3===1?['teal','leaf','mint']:['leaf','leafLight','grass'];
  for(let layer=0;layer<2;layer++){
    const count=layer?4:6;
    for(let i=0;i<count;i++){
      const a=angle+i*TAU/count+layer*.47,rr=(layer?.025:.055)*s;
      solidLeaf(b,[x+Math.cos(a)*rr,y+.045*s+layer*.10*s,z+Math.sin(a)*rr],a,
        (layer?.48:.88)*s,(layer?.17:.23)*s,(layer?.79:.42)*s,(layer?.08:.18)*s,
        colors[layer?2:i%2],4,.24);
    }
  }
  solidLeaf(b,[x,y+.12*s,z],angle+.4,.16*s,.115*s,.94*s,.03*s,colors[2],5,.26);
}

export function grassClump(b,x,y,z,s=.45,angle=0){
  for(let i=0;i<5;i++){
    const a=angle+i*2.4;
    solidLeaf(b,[x,y-.015,z],a,(.36+(i%2)*.15)*s,.05*s,(.7+(i%3)*.14)*s,.17*s,
      i%3===0?'leafLight':i%3===1?'grass':'leaf',4,.18);
  }
}
export function flower(b,x,y,z,s=.22,color='pink',angle=0){
  const h=s*1.65;
  taperedStem(b,[[x,y,z],[x+s*.08,y+h*.6,z],[x+s*.12,y+h,z]],.025*s,.018*s,'leafDark','botany: flower stem',5);
  for(let k=0;k<5;k++){
    const a=angle+k*TAU/5;
    solidLeaf(b,[x+s*.12,y+h,z],a,s*.55,s*.24,s*.19,s*.13,color,4,.28);
  }
  ellipsoid(b,[x+s*.12,y+h+.035*s,z],[s*.18,s*.12,s*.18],'gold',identity,8);
}

export function leafySprig(b,x,y,z,s=.55,angle=0){
  const h=s*.85;
  taperedStem(b,[[x,y,z],[x+.08*s,y+h*.55,z],[x+.16*s,y+h,z]],.035*s,.015*s,'leafDark');
  for(let j=0;j<3;j++)for(const sign of [-1,1]){
    const a=angle+sign*(1.03+j*.12),yy=y+h*(.32+j*.24);
    solidLeaf(b,[x+.12*s*j/3,yy,z],a,s*(.40-j*.06),s*.15,s*.18,s*.09,j===2?'leafLight':'leaf',4,.20);
  }
}

export function planter(b,x,y,z,s=1,angle=0){
  // Lathed ceramic body: tapered foot, curved belly, rolled rim and open soil.
  const profile=[[.34,0],[.41,.045],[.44,.12],[.47,.40],[.51,.53],[.57,.55],[.58,.59],[.54,.64],[.48,.64],[.46,.58],[.44,.53]];
  const g=new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r*s,h*s)),20);
  addTranslated(b,g,'ivory',[x,y,z],'botany: shaped ceramic planter');
  cylinder(b,[x,y+.08*s,z],.42*s,.045*s,'peach',.43*s,20);
  cylinder(b,[x,y+.535*s,z],.455*s,.025*s,'woodDark',.455*s,20);
  const variant=Math.abs(Math.round(x*17+z*11))%3;
  rosette(b,x-.07*s,y+.56*s,z,.52*s,angle,variant);
  rosette(b,x+.25*s,y+.56*s,z+.13*s,.21*s,angle+2,variant+1);
  leafySprig(b,x-.21*s,y+.55*s,z-.13*s,.54*s,angle+1.8);
  for(const [dx,dz] of [[.21,-.16],[.31,-.06]])flower(b,x+dx*s,y+.55*s,z+dz*s,.17*s,variant?'porcelain':'pink',angle);
}
function addTranslated(b,g,c,p,label){b.add(g,c,p,identity,unit,false,label);}

export function palm(b,x,y,z,height=4.2,angle=0){
  const rnd=seeded(Math.round((x*37+z*71+height*43+angle*19)*100));
  const bend=.48,pts=[];
  const center=t=>[x+Math.cos(angle)*bend*t*t,y+height*t,z+Math.sin(angle)*bend*t*t];
  for(let i=0;i<=16;i++)pts.push(center(i/16));
  taperedStem(b,pts,.19,.095,'wood','botany: curved tapered palm trunk',9);
  // Flush angled collars, not detached stacks of horizontal cylinders.
  for(let i=1;i<=14;i++){
    const t=i/16,at=center(t),tangent=V(center(Math.min(1,t+.01))).sub(V(center(Math.max(0,t-.01)))).normalize();
    const r=lerp(.19,.095,t),g=new THREE.CylinderGeometry(r*1.045,r*1.10,.055,9);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),tangent));
    addTranslated(b,g,i%3?'woodDark':'sand',at,'botany: palm growth collar');
  }
  for(let i=0;i<5;i++){
    const a=angle+i*TAU/5;
    taperedStem(b,[[x,y+.20,z],[x+Math.cos(a)*.21,y+.07,z+Math.sin(a)*.21],[x+Math.cos(a)*.34,y+.015,z+Math.sin(a)*.34]],.085,.025,'woodDark','botany: grounded root flare',6);
  }
  const crown=center(1),size=Math.min(1.06,Math.max(.78,height/3.7));
  const fronds=9;
  for(let f=0;f<fronds;f++){
    const a=angle+f*TAU/fronds+(rnd()-.5)*.16,upper=f%3===0;
    const L=(upper?1.65:2.05)*size*(.94+rnd()*.13);
    const lift=upper?.70:.40,droop=upper?.66:1.00;
    const point=t=>[crown[0]+Math.cos(a)*L*t,crown[1]+lift*Math.sin(t*Math.PI)-droop*t*t,crown[2]+Math.sin(a)*L*t];
    const rachis=Array.from({length:7},(_,i)=>point(i/6));
    taperedStem(b,rachis,.048*size,.009*size,upper?'leafLight':'leaf','botany: palm frond spine',5);
    // Broad overlapping leaflets retain a cute coherent crown at overview scale.
    for(let j=0;j<6;j++){
      const t=.17+j*.122,at=point(t),span=(.25+.63*Math.pow(Math.sin(Math.PI*t),.8))*size;
      for(const sign of [-1,1]){
        const leafAngle=a+sign*(1.08-.12*t),c=upper?(j%3?'grass':'leafLight'):(f%2?'leaf':'leafDark');
        solidLeaf(b,at,leafAngle,span,.135*size*(1-t*.36),.06*size,(.14+.11*t)*size,c,2,.13);
      }
    }
    solidLeaf(b,point(.81),a,L*.25,.095*size,-.06,.17,'leafLight',4,.14);
  }
  // Upright emerging spears break the flat pinwheel crown silhouette.
  for(let i=0;i<3;i++)solidLeaf(b,crown,angle+i*TAU/3,.42*size,.15*size,.77*size,.05,'leafLight',5,.18);
  for(let i=0;i<3;i++){
    const a=angle+i*TAU/3;
    ellipsoid(b,[crown[0]+Math.cos(a)*.18,crown[1]-.15,crown[2]+Math.sin(a)*.18],[.16,.21,.16],i%2?'woodDark':'wood',identity,10);
  }
}

// Irregular bevel-shouldered rock solids, rather than scaled platonic solids.
// Their flat upper ledges are explicit support surfaces for planting.
export function coastalRock(b,x,y,z,rx,rz,height,seed=1){
  const rnd=seeded(seed),n=9,angles=[],radii=[];
  for(let i=0;i<n;i++){angles.push(i*TAU/n+(rnd()-.5)*.19);radii.push(.87+rnd()*.20);}
  const rings=[[0,.83],[.13,1.0],[.47,.96],[.76,.88],[.93,.73],[1,.55]],rows=[];
  for(const [h,r] of rings)rows.push(angles.map((a,i)=>[x+Math.cos(a)*rx*r*radii[i]+rx*.09*h,y+h*height,z+Math.sin(a)*rz*r*radii[i]-rz*.07*h]));
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){
    const k=(i+1)%n,g=geometry([rows[j][i],rows[j][k],rows[j+1][k],rows[j+1][i]],[0,2,1,0,3,2]).toNonIndexed();g.computeVertexNormals();
    add(b,g,j===0?'stoneDark':j===rings.length-2?(i%3?'stoneLight':'stone'):((i+seed)%4===0?'stoneDark':'stone'),'offshore: weathered rock face');
  }
  const center=[x+rx*.09,y+height,z-rz*.07],v=[center,...rows.at(-1)],ix=[];
  for(let i=0;i<n;i++)ix.push(0,1+(i+1)%n,i+1);
  add(b,geometry(v,ix),'stoneLight','offshore: planting ledge');
  const bottom=[[x,y,z],...rows[0]],bi=[];for(let i=0;i<n;i++)bi.push(0,i+1,1+(i+1)%n);
  add(b,geometry(bottom,bi),'stoneDark','offshore: submerged rock base');
  // Plant runners sample the actual rock faces, so they neither float nor
  // disappear inside the widening lower shoulders.
  const side=(t,a)=>{
    a=((a-angles[0])%TAU+TAU)%TAU+angles[0];
    let k=0;while(k<n-1&&angles[k+1]<a)k++;
    const next=(k+1)%n,span=(k===n-1?angles[0]+TAU:angles[k+1])-angles[k],u=(a-angles[k])/span;
    let j=0;while(j<rings.length-2&&rings[j+1][0]<t)j++;
    const v=THREE.MathUtils.clamp((t-rings[j][0])/(rings[j+1][0]-rings[j][0]),0,1);
    const low=V(rows[j][k]).lerp(V(rows[j][next]),u),high=V(rows[j+1][k]).lerp(V(rows[j+1][next]),u);
    return low.lerp(high,v).add(new THREE.Vector3(Math.cos(a)*.038,0,Math.sin(a)*.038)).toArray();
  };
  return {x:center[0],y:center[1],z:center[2],rx:rx*.55,rz:rz*.55,side};
}
function turfPatch(b,x,y,z,rx,rz,seed){
  // Flush, broken patches of ground cover on the rock's actual top plane.
  // No raised green disk or continuous brown "cookie" edge.
  const rnd=seeded(seed);
  for(let patch=0;patch<3;patch++){
    const a=patch*2.3+seed*.01,cx=x+Math.cos(a)*rx*.28,cz=z+Math.sin(a)*rz*.28;
    const pts=Array.from({length:9},(_,i)=>{
      const th=i*TAU/9,r=.64+rnd()*.36;
      return[cx+Math.cos(th)*rx*.67*r,y+.008+patch*.002,cz+Math.sin(th)*rz*.62*r];
    });
    const vertices=[[cx,y+.008+patch*.002,cz],...pts],indices=[];
    for(let i=0;i<9;i++)indices.push(0,1+(i+1)%9,i+1);
    add(b,geometry(vertices,indices),patch===1?'leaf':'grass','offshore: flush irregular groundcover');
  }
}
function trailingPlant(b,rock,angle,scale=.4){
  const points=Array.from({length:8},(_,i)=>rock.side(.96-i/7*.57,angle+.035*Math.sin(i*.85)));
  taperedStem(b,points,.027,.010,'leafDark','botany: rock-attached trailing stem',5);
  for(let i=0;i<7;i++)for(const sign of [-1,1]){
    solidLeaf(b,points[i],angle+sign*1.07,scale*(.62+i*.025),scale*.24,.045,.17,i%3?'leaf':'grass',4,.23);
  }
}
export const ISLETS=Object.freeze([
  {x:-17,z:-17,r:2.2,h:2.9,kind:'leaning palm',palms:1},
  {x:17,z:-18,r:2.9,h:3.8,kind:'twin crown',palms:2},
  {x:7,z:17,r:1.7,h:1.8,kind:'flower ledge',palms:0},
  {x:-34,z:-2,r:2.0,h:2.7,kind:'split spine',palms:1},
  {x:33,z:-9,r:2.2,h:3.1,kind:'windward palm',palms:1},
  {x:-5,z:20,r:1.1,h:1.35,kind:'tidal garden',palms:0}
]);
export function offshore(b,config,sea=-3.45){
  for(const [index,site] of ISLETS.entries()){
    const {x,z,r,h}=site,rnd=seeded(config.seed+index*7919),seed=config.seed+index*31;
    const main=coastalRock(b,x-r*.10,sea-.26,z,r*.78,r*.66,h,seed);
    const shelf=coastalRock(b,x+r*.63,sea-.29,z+r*.18,r*.58,r*.51,h*.66,seed+1);
    coastalRock(b,x-r*.51,sea-.27,z-r*.49,r*.48,r*.44,h*.79,seed+2);
    coastalRock(b,x+r*.11,sea-.29,z+r*.64,r*.49,r*.35,h*.38,seed+3);
    // Low scattered talus visibly meets the sea, with no round grass cap.
    for(let k=0;k<5;k++){
      const a=k*TAU/5+.6,rr=r*(.90+rnd()*.12);
      coastalRock(b,x+Math.cos(a)*rr,sea-.22,z+Math.sin(a)*rr,r*(.14+rnd()*.10),r*.16,.33+rnd()*.48,seed+10+k);
    }
    turfPatch(b,main.x,main.y,main.z,main.rx*.90,main.rz*.84,seed);
    turfPatch(b,shelf.x,shelf.y,shelf.z,shelf.rx*.87,shelf.rz*.86,seed+2);
    if(config.greenery){
      if(site.palms)palm(b,main.x-.04,main.y+.018,main.z,2.15+r*.32,index*.79+.2);
      if(site.palms>1)palm(b,shelf.x,shelf.y+.018,shelf.z,2.0,index*1.1+2.3);
      for(const [j,ledge] of [main,shelf].entries()){
        for(let k=0;k<3;k++){
          const a=k*TAU/3+index*.6,xx=ledge.x+Math.cos(a)*ledge.rx*.49,zz=ledge.z+Math.sin(a)*ledge.rz*.49;
          rosette(b,xx,ledge.y+.018,zz,Math.min(.44,r*.18),a,index+j+k);
          if(k===1)flower(b,xx+.10,ledge.y+.018,zz,.22,index%2?'porcelain':'pink',a);
        }
        grassClump(b,ledge.x-.22,ledge.y+.018,ledge.z-.18,.52,index);
      }
      trailingPlant(b,main,Math.PI/2,Math.min(.43,r*.21));
      if(r>2)trailingPlant(b,shelf,.10,Math.min(.36,r*.16));
      if(site.palms===0)leafySprig(b,main.x,main.y+.018,main.z,.85,index);
    }
    // Broken opaque shore strokes follow the cluster, not a perfect disk.
    for(let k=0;k<5;k++){
      const a=index*.35+k*TAU/5,rad=r*(1.13+.06*Math.sin(k*2.4));
      const points=Array.from({length:5},(_,j)=>{const t=a+(j/4-.5)*.38;return[x+Math.cos(t)*rad,sea+.028,z+Math.sin(t)*rad*.88];});
      taperedStem(b,points,.027,.012,'foam','offshore: opaque shore stroke',5);
    }
  }
}
