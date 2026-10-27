// Authored skatepark refresh: smooth transitions and intentional run-out space.
// Static modeling only. No skating simulation, colliders or new materials.
import * as THREE from 'three';
import {TAU,box,bar,tube,geometry} from './coast-kit.mjs';

export const SKATE_PLAN=Object.freeze({
  bowl:{dx:2.2,dz:1.0,rx:4.9,rz:4.4,depth:1.65,flat:.46,outer:1.08,rollInAngle:-2.28},
  quarter:{dx:-4.5,dz:-6.25,width:2.8,length:2.15,height:1.15,deck:.65},
  ledge:{dx:-7.35,dz:2.0,width:.82,length:2.8,height:.36},
  terrace:{dx:2.0,dz:-7.4,width:6.6,depth:1.75},
  // Coordinates relative to the island. These are geometry-review corridors.
  routes:[
    {id:'bridge-arrival',a:[-10.2,-3.99],b:[-5.7,-2.23],width:3.0},
    {id:'street-runout',a:[-4.5,-4.0],b:[-4.5,5.8],width:2.2},
    {id:'spectator-access',a:[-2.6,-5.2],b:[5.4,-5.2],width:1.65}
  ]
});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function bowlPoint(site,a,r,h){
  const q=SKATE_PLAN.bowl,warp=1+.065*Math.sin(3*a);
  return [site.x+q.dx+Math.cos(a)*q.rx*r*warp,site.y+h,site.z+q.dz+Math.sin(a)*q.rz*r];
}
function rollWeight(a){return 1-smooth((Math.abs(wrap(a-SKATE_PLAN.bowl.rollInAngle))-.16)/.23);}
export function bowlProfile(t,a){
  const q=SKATE_PLAN.bowl,theta=t*Math.PI/2;
  const r=q.flat+(1-q.flat)*Math.sin(theta);
  const normal=-q.depth*Math.cos(theta);
  // A broad, flush roll-in interrupts the near-vertical wall at the entrance.
  const rolled=-q.depth+q.depth*smooth((r-q.flat)/(1-q.flat));
  return {r,h:THREE.MathUtils.lerp(normal,rolled,rollWeight(a))};
}
function surfaceNormal(site,t,a){
  // Shared derivative normal, including across palette strips and angular seams.
  const e=.0001,ts=Math.max(.00001,Math.min(.99999,t));
  const p=(tt,aa)=>{const s=bowlProfile(tt,aa);return new THREE.Vector3(...bowlPoint(site,aa,s.r,s.h));};
  const radial=p(Math.min(1,ts+e),a).sub(p(Math.max(0,ts-e),a));
  const around=p(ts,a+e).sub(p(ts,a-e));
  return around.cross(radial).normalize().toArray();
}
function bowl(b,site){
  const q=SKATE_PLAN.bowl,segments=96,steps=28;
  // A flat central floor with an explicit upward normal, no degenerate center ring.
  const floor=[[site.x+q.dx,site.y-q.depth,site.z+q.dz]],ii=[];
  for(let i=0;i<=segments;i++)floor.push(bowlPoint(site,i*TAU/segments,q.flat,-q.depth));
  for(let i=0;i<segments;i++)ii.push(0,i+2,i+1);
  b.add(geometry(floor,ii),'sky',[0,0,0],[0,0,0],[1,1,1],false,'bowl flat floor');
  // Fine geometry with continuous normals; palette bands do not create shading seams.
  for(let j=0;j<steps;j++)for(let sector=0;sector<12;sector++){
    const verts=[],normals=[],idx=[];
    for(let i=0;i<=8;i++)for(const k of [j,j+1]){
      const a=(sector*8+i)*TAU/segments,t=k/steps,s=bowlProfile(t,a);
      verts.push(bowlPoint(site,a,s.r,s.h));normals.push(surfaceNormal(site,t,a));
    }
    for(let i=0;i<8;i++){const k=i*2;idx.push(k,k+3,k+1,k,k+2,k+3);}
    const g=geometry(verts,idx);g.setAttribute('normal',new THREE.Float32BufferAttribute(normals.flat(),3));
    g.setAttribute('paletteHeight',new THREE.Float32BufferAttribute(verts.map(p=>(p[1]-site.y+q.depth)/q.depth),1));
    const midAngle=(sector+.5)*TAU/12;
    const c=rollWeight(midAngle)>.1?'peach':sector===1||sector===2?'salmon':j<10?'sky':j<21?'aqua':'blue';
    b.add(g,c,[0,0,0],[0,0,0],[1,1,1],false,'smooth bowl transition');
  }
  // Flat apron matches the slab opening exactly. The mouth has no raised coping.
  for(let i=0;i<segments;i++){
    const a=i*TAU/segments,aa=(i+1)*TAU/segments;
    b.add(geometry([bowlPoint(site,a,1,.045),bowlPoint(site,aa,1,.045),bowlPoint(site,aa,q.outer,.045),bowlPoint(site,a,q.outer,.045)],[0,1,2,0,2,3]),'ivory');
  }
  const start=q.rollInAngle+.40,end=q.rollInAngle+TAU-.40,points=[];
  for(let i=0;i<=100;i++)points.push(bowlPoint(site,start+(end-start)*i/100,1.012,.075));
  tube(b,points,.045,'porcelain');
  // Short painted runway marks identify the flush roll-in without a sign or FX.
  for(const off of [-.14,.14]){
    const a=q.rollInAngle+off;
    bar(b,bowlPoint(site,a,1.09,.061),bowlPoint(site,a,1.19,.061),.035,'gold');
  }
}
function quarterPipe(b,site){
  const q=SKATE_PLAN.quarter,x=site.x+q.dx,z=site.z+q.dz,y=site.y;
  const n=24,v=[],ix=[],normals=[],front=z+q.length*.5,back=z-q.length*.5;
  // Quarter-ellipse: tangent to the ground at the toe and steep at the coping.
  for(let j=0;j<=n;j++){
    const a=j/n*Math.PI/2,zz=front-q.length*Math.sin(a),h=q.height*(1-Math.cos(a));
    const nn=new THREE.Vector3(0,q.length*Math.cos(a),q.height*Math.sin(a)).normalize();
    for(const side of [-1,1]){v.push([x+side*q.width/2,y+.04+h,zz]);normals.push(nn.toArray());}
  }
  for(let j=0;j<n;j++){const k=j*2;ix.push(k,k+1,k+3,k,k+3,k+2);}
  const surface=geometry(v,ix);surface.setAttribute('normal',new THREE.Float32BufferAttribute(normals.flat(),3));
  b.add(surface,'sky',[0,0,0],[0,0,0],[1,1,1],false,'quarter pipe curved riding surface');
  // Side walls follow the same curve and meet the foundation; not a floating sheet.
  for(const side of [-1,1]){
    const vs=[[x+side*q.width/2,y,front],[x+side*q.width/2,y,back-q.deck]];
    vs.push([x+side*q.width/2,y+.04+q.height,back-q.deck]);
    for(let j=n;j>=0;j--){const a=j/n*Math.PI/2;vs.push([x+side*q.width/2,y+.04+q.height*(1-Math.cos(a)),front-q.length*Math.sin(a)]);}
    const shape=vs.map(p=>new THREE.Vector2(p[2],p[1]));
    const faces=THREE.ShapeUtils.triangulateShape(shape,[]);
    const g=geometry(vs,faces.map(f=>side<0?f:[f[0],f[2],f[1]]));
    b.add(g,'salmon',[0,0,0],[0,0,0],[1,1,1],false,'quarter pipe closed cheek');
  }
  box(b,[x,y+(q.height+.04)/2,back-q.deck*.5],[q.width,q.height+.04,q.deck],'ivory',.035);
  box(b,[x,y+q.height+.065,back-q.deck*.5],[q.width,.05,q.deck],'peach',.02);
  bar(b,[x-q.width/2,y+q.height+.075,back],[x+q.width/2,y+q.height+.075,back],.055,'porcelain');
  // Rear safety rail and structural legs share the platform's footprint.
  for(const side of [-1,1])bar(b,[x+side*(q.width/2-.12),y+q.height,back-q.deck+.1],[x+side*(q.width/2-.12),y+q.height+.78,back-q.deck+.1],.045,'teal');
  bar(b,[x-q.width/2+.12,y+q.height+.78,back-q.deck+.1],[x+q.width/2-.12,y+q.height+.78,back-q.deck+.1],.055,'teal');
}
export function buildSkate(b,config,site,kit){
  const {x,z,y}=site,q=SKATE_PLAN.bowl;
  const hole=Array.from({length:96},(_,i)=>{const p=bowlPoint(site,i*TAU/96,q.outer,.045);return[p[0],p[2]];});
  kit.island(b,site,[hole]);bowl(b,site);
  // Only the actual bridge is an opening; the former gap led directly off the cliff.
  kit.perimeter(b,site,[Math.atan2(-4-z,-x)],false);
  // Broad paved entrance and street ribbon. Color does not substitute for free space.
  for(const side of [-1,1]){
    const xx=x-4.5+side*1.19,yy=y+.045;
    b.add(geometry([[xx-.035,yy,z-2.45],[xx+.035,yy,z-2.45],[xx+.035,yy,z+5.45],[xx-.035,yy,z+5.45]],[0,2,1,0,3,2]),'peach');
  }
  quarterPipe(b,site);
  const l=SKATE_PLAN.ledge;
  box(b,[x+l.dx,y+l.height/2,z+l.dz],[l.width,l.height,l.length],'salmon',.10);
  box(b,[x+l.dx,y+l.height+.04,z+l.dz],[l.width+.06,.08,l.length+.06],'porcelain',.035);
  // Low, separate rail, with clear approach at both ends and no hidden wall behind it.
  for(const end of [-1,1])bar(b,[x-1.0+end*.9,y,z+7.55],[x-1.0+end*.9,y+.48,z+7.55],.04,'teal');
  bar(b,[x-2.3,y+.48,z+7.55],[x+.3,y+.48,z+7.55],.055,'blue');
  const t=SKATE_PLAN.terrace;
  for(let i=0;i<3;i++){
    const h=(i+1)*.22;
    box(b,[x+t.dx,y+h/2,z+t.dz-i*.30],[t.width-i*.24,h,t.depth-i*.35],i%2?'peach':'ivory',.055);
  }
  for(const off of [-1.7,1.5]){
    box(b,[x+t.dx+off,y+.83,z-7.93],[2.05,.23,.67],'coral',.10);
    box(b,[x+t.dx+off,y+1.15,z-8.25],[2.1,.62,.18],'ivory',.055);
  }
  // Compact integrated planters, away from the riding and arrival envelopes.
  for(const [dx,dz,tree] of [[-2.3,-7.8,true],[6.0,-6.0,true],[7.4,5.25,false]]){
    box(b,[x+dx,y+.23,z+dz],[1.12,.46,1.12],'ivory',.14);
    box(b,[x+dx,y+.47,z+dz],[1.02,.07,1.02],'woodDark',.10);
    if(tree&&config.greenery)kit.palm(b,x+dx,y+.51,z+dz,3.65,dx<0?1.8:0.2);
    else kit.plant(b,x+dx,y+.50,z+dz,.65);
  }
  kit.skateboard(b,x+2.0,y+.76,z-7.85,.6);
}
