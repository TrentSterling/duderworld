// Authored coastal diorama. Parameters vary planting, not architectural quality.
// All modeling is ordinary geometry. No transparent water, foliage or portals.
import * as THREE from 'three';
import {Batch,TAU,box,ellipsoid,cylinder,bar,tube,slab,ellipsePoints,arcBlock,
  floorTile,roundedArch,geometry,seeded} from './coast-kit.mjs';

export const COAST_VERSION='0.5.0';
export const SITES=Object.freeze({hub:{x:0,z:-4,r:12,y:.65},skate:{x:23,z:5,r:10.4,y:.65},beach:{x:-22,z:9,r:8.8,y:-2.45}});
const SEA=-3.45;
function islandRadius(r,a,seed=0){return r*(1+.024*Math.sin(a*5+seed)+.018*Math.cos(a*9));}
function island(b,site,holes=[],beach=false){
  const {x,z,r,y}=site,n=72;
  const contour=Array.from({length:n},(_,i)=>{const a=i*TAU/n,rr=islandRadius(r,a,x);return [x+rr*Math.cos(a),z+rr*Math.sin(a)];});
  slab(b,contour,holes,y,.26,beach?'sandLight':'cream',.035);
  const levels=beach?[[1,y-.24],[1.08,y-.44],[1.16,-3.33],[1.10,-3.75]]:
    [[1,y-.25],[1.035,y-.44],[1.035,y-.80],[.94,-2.0],[.87,-3.80]];
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<n;i++){
    const angle=k=>k*TAU/n;
    const pt=(k,l)=>{const a=angle(k),rr=islandRadius(r,a,x)*levels[l][0];return[x+rr*Math.cos(a),levels[l][1],z+rr*Math.sin(a)];};
    b.add(geometry([pt(i,j),pt(i,j+1),pt(i+1,j+1),pt(i+1,j)],[0,2,1,0,3,2]),
      beach?(j<2?'sand':'stone'):(j===0?'ivory':j===1?'peach':i%7<2?'stoneDark':'stoneLight'));
  }
  if(!beach){
    for(let i=0;i<26;i++){
      const a=i*TAU/26+.1,rr=r*(.92+.025*Math.sin(i*8));
      b.add(new THREE.IcosahedronGeometry(1,0),i%4===0?'stoneDark':i%3===0?'stone':'stoneLight',
        [x+rr*Math.cos(a),-1.8+Math.sin(i)*.22,z+rr*Math.sin(a)],[.07*Math.sin(i),a,.13*Math.cos(i)],
        [.75+.25*(i%3),1.35+.3*Math.sin(i*3),.70]);
    }
  }
  const shoreline=beach?1.16:.98;
  const verts=[],ind=[];
  for(let i=0;i<=n;i++)for(const rr of [shoreline,shoreline+.045+.018*Math.sin(i*1.8)]){
    const a=i*TAU/n,rad=islandRadius(r,a,x)*rr;
    verts.push([x+rad*Math.cos(a),SEA+.045,z+rad*Math.sin(a)]);
  }
  for(let i=0;i<n;i++){let j=i*2;ind.push(j,j+3,j+1,j,j+2,j+3);}
  b.add(geometry(verts,ind),'foam');
}
function plant(b,x,y,z,s=1,angle=0){
  cylinder(b,[x,y,z],.48*s,.6*s,'ivory',.58*s,14);
  cylinder(b,[x,y+.53*s,z],.55*s,.10*s,'porcelain',.58*s,16);
  cylinder(b,[x,y+.60*s,z],.43*s,.035*s,'woodDark',.43*s,14);
  for(let i=0;i<7;i++){
    const a=angle+i*TAU/7;
    ellipsoid(b,[x+Math.cos(a)*.27*s,y+(.88+(i%3)*.07)*s,z+Math.sin(a)*.27*s],
      [.17*s,.43*s,.20*s],i%3===0?'leafLight':i%3===1?'leaf':'leafDark',[.40*Math.sin(a),a,.40*Math.cos(a)],10);
  }
  ellipsoid(b,[x,y+1.1*s,z],[.19*s,.42*s,.20*s],'leafLight',[0,angle,0],10);
}
function palm(b,x,y,z,height=4.2,angle=0){
  const bend=.5,pts=[];
  for(let i=0;i<=7;i++){
    const t=i/7;pts.push([x+Math.cos(angle)*bend*t*t,y+height*t,z+Math.sin(angle)*bend*t*t]);
  }
  tube(b,pts,.13,'wood');
  for(let i=1;i<6;i++){
    const t=i/7; cylinder(b,[x+Math.cos(angle)*bend*t*t,y+height*t-.04,z+Math.sin(angle)*bend*t*t],.155,.07,'woodDark',.15,9);
  }
  const cx=x+Math.cos(angle)*bend,cz=z+Math.sin(angle)*bend,cy=y+height;
  for(let f=0;f<7;f++){
    const a=angle+f*TAU/7,L=1.75+(f%3)*.18,vs=[],ix=[];
    // Solid leaf blades, not alpha cards. Upper and lower surfaces share a spine.
    for(let j=0;j<=7;j++){
      const t=j/7,d=L*t,w=.34*Math.sin(Math.PI*t)+.012;
      const h=.35*Math.sin(t*Math.PI)-.65*t*t;
      for(const [side,off] of [[-1,0],[0,.08],[1,0],[0,-.035]])
        vs.push([cx+Math.cos(a)*d-Math.sin(a)*w*side,cy+h+off,cz+Math.sin(a)*d+Math.cos(a)*w*side]);
    }
    for(let j=0;j<7;j++)for(let s=0;s<4;s++){
      const k=j*4+s,next=j*4+(s+1)%4;ix.push(k,next,next+4,k,next+4,k+4);
    }
    const leaf=geometry(vs,ix).toNonIndexed();
    leaf.computeVertexNormals();
    b.add(leaf,f%3===0?'leafLight':f%3===1?'leaf':'leafDark',[0,0,0],[0,0,0],[1,1,1],false,'solid palm leaf');
  }
  for(let i=0;i<3;i++)ellipsoid(b,[cx+.15*Math.cos(i*2.1),cy-.13,cz+.15*Math.sin(i*2.1)],[.16,.20,.16],'woodDark');
}
function pillar(b,x,y,z,h=3.5,accent='coral',scale=1){
  const r=.46*scale;
  cylinder(b,[x,y,z],r*1.28,.22,'ivory',r*1.26,20);
  cylinder(b,[x,y+.22,z],r,h-.4,'ivory',r,24);
  cylinder(b,[x,y+.24,z],r*1.01,.65*scale,accent,r*1.01,24);
  cylinder(b,[x,y+h-.33,z],r*1.15,.24,'porcelain',r*1.15,24);
  cylinder(b,[x,y+h-.09,z],r*1.02,.13,accent,r,24);
  // Small opaque lit insert. No actual point light or bloom pass.
  box(b,[x,y+h*.59,z+r+.014],[r*.70,.61*scale,.095],'gold',.07,0,0,true);
  box(b,[x,y+h*.59,z+r+.073],[r*.40,.39*scale,.03],'yellow',.035,0,0,true);
}
function bollard(b,x,y,z){
  cylinder(b,[x,y,z],.23,.72,'ivory',.21,12);
  cylinder(b,[x,y+.66,z],.28,.16,'coral',.28,14);
  cylinder(b,[x,y+.82,z],.20,.10,'yellow',.19,14,true);
}
function perimeter(b,site,openings=[],backHigh=false){
  const {x,z,r,y}=site,n=32,rr=r*.93;
  for(let i=0;i<n;i++){
    const a=i*TAU/n,mid=a+TAU/n*.5;
    if(openings.some(o=>Math.abs(Math.atan2(Math.sin(mid-o),Math.cos(mid-o)))<.25))continue;
    const h=backHigh&&Math.sin(mid)<-.4?1.5:.65;
    arcBlock(b,x,z,rr-.18,rr+.18,y,h,a+.007,a+TAU/n-.007,'ivory');
    arcBlock(b,x,z,rr-.25,rr+.24,y+h,.17,a+.009,a+TAU/n-.009,i%4===0?'sky':i%3===0?'gold':'salmon');
    if(i%4===0){const px=x+Math.cos(mid)*rr,pz=z+Math.sin(mid)*rr;
      pillar(b,px,y,pz,backHigh&&Math.sin(mid)<-.4?3.4:1.55,i%2?'blue':'coral',.72);
    }
  }
}
function benchArc(b,x,z,r0,r1,y,a0,a1,col='coral'){
  arcBlock(b,x,z,r0,r1,y,.36,a0,a1,'ivory');
  const cushions=Math.max(2,Math.round((a1-a0)*(r0+r1)/3));
  for(let i=0;i<cushions;i++){
    const lo=a0+(a1-a0)*i/cushions+.012,hi=a0+(a1-a0)*(i+1)/cushions-.012;
    arcBlock(b,x,z,r0+.04,r1-.03,y+.37,.23,lo,hi,col);
  }
  arcBlock(b,x,z,r1-.14,r1+.18,y+.31,.68,a0,a1,'porcelain');
  arcBlock(b,x,z,r1-.15,r1+.15,y+.88,.11,a0,a1,col);
  for(const a of [a0+.035,a1-.035]){
    box(b,[x+Math.cos(a)*(r0+r1)/2,y+.70,z+Math.sin(a)*(r0+r1)/2],[r1-r0+.2,.17,.21],'gold',.07,-a);
  }
}
function hub(b,config){
  const s=SITES.hub,{x,z,y}=s;island(b,s);
  const bearings=[SITES.skate,SITES.beach].map(t=>Math.atan2(t.z-z,t.x-x));
  perimeter(b,s,[...bearings,Math.PI/2],false);
  // A coherent courtyard mosaic, not scattered colored decals.
  for(let ring=0;ring<5;ring++){
    const r0=1.9+ring*1.32,r1=r0+1.29,n=16+ring*8;
    for(let i=0;i<n;i++){
      const c=ring===1?(i%5===0?'sky':i%5===1?'peach':'ivory'):
        ring===3?(i%6===0?'gold':i%6===1?'salmon':'porcelain'):
        ['ivory','cream','porcelain','peach'][((i*7+ring)%13)%4];
      floorTile(b,0,-1,r0,r1,y+.047,i*TAU/n+.003,(i+1)*TAU/n-.003,c);
    }
  }
  cylinder(b,[0,y,-1],1.90,.19,'sky',1.90,56);
  cylinder(b,[0,y+.19,-1],1.69,.19,'ivory',1.64,48);
  cylinder(b,[0,y+.38,-1],1.48,.35,'salmon',1.45,48);
  cylinder(b,[0,y+.72,-1],1.55,.14,'porcelain',1.55,48);
  cylinder(b,[0,y+.86,-1],1.30,.04,'woodDark',1.3,40);
  palm(b,0,y+.9,-1,3.6,.4);
  for(let i=0;i<7;i++){const a=i*TAU/7;
    ellipsoid(b,[Math.cos(a)*.85,y+1.10,-1+Math.sin(a)*.85],[.36,.35,.40],i%2?'leaf':'leafLight');
  }
  // Broad, integrated entrance steps and a substantial arch facade.
  for(let i=0;i<3;i++){
    box(b,[0,y+.12+i*.23,-10.8-i*.31],[13.3-i*.48,.24,3.45-i*.62],i%2?'ivory':'porcelain',.08);
  }
  const py=y+.70,pz=-12.0;
  roundedArch(b,0,py,pz,13.2,6.75,.95,'ivory',0);
  roundedArch(b,0,py,pz+.55,12.8,6.45,.26,'sky',.64);
  roundedArch(b,0,py,pz+.72,11.35,5.74,.19,'salmon',.32);
  for(const [xx,h,w,c] of [[-3.5,3.3,2.65,'portalBlue'],[0,4.05,3.05,'portalGold'],[3.5,3.3,2.65,'portalPink']]){
    roundedArch(b,xx,py,pz+.58,w+.55,h+.28,.45,'teal',0);
    roundedArch(b,xx,py,pz+.86,w,h,.37,'porcelain',.20);
    roundedArch(b,xx,py+.08,pz+.93,w-.4,h-.15,.08,c,0,true);
    roundedArch(b,xx,py+.11,pz+1.03,w-.63,h-.36,.04,'yellow',.04,true);
    box(b,[xx,py+.08,pz+1.25],[w+.2,.13,.72],'ivory',.06);
  }
  for(const xx of [-6.5,6.5]){
    pillar(b,xx,py-.3,pz+.25,5.1,'coral',1.35);
    cylinder(b,[xx,py+4.82,pz+.25],.76,.18,'porcelain',.76,28);
  }
  // Character-like round badge made from geometry, no text decal.
  cylinder(b,[0,py+5.37,pz+.73],.53,.12,'blue',.53,24); // backing side detail
  ellipsoid(b,[0,py+5.65,pz+1.0],[.62,.56,.12],'blue');
  ellipsoid(b,[-.22,py+5.68,pz+1.13],[.065,.09,.035],'ink');
  ellipsoid(b,[.22,py+5.68,pz+1.13],[.065,.09,.035],'ink');
  // Side lounge walls and their furniture share the same footprint.
  for(const sign of [-1,1]){
    box(b,[sign*7.5,y+1.1,-9.0],[2.5,2.2,2.5],'ivory',.25);
    box(b,[sign*7.5,y+2.25,-9.0],[2.7,.26,2.7],'salmon',.12);
    plant(b,sign*7.5,y+2.40,-9.0,1.0,sign);
    const a0=sign<0?2.42:-.44,a1=sign<0?3.53:.68;
    benchArc(b,0,-1,7.6,8.48,y+.06,a0,a1,sign<0?'gold':'coral');
    plant(b,sign*8.8,y,-5.2,.95);
    plant(b,sign*8.7,y,2.4,1.0);
    if(config.greenery){palm(b,sign*9.0,y,-9.0,4.0,sign<0?.6:2.5);}
  }
  for(const [px,pz,s] of [[-5,6,.85],[5,6,.85],[-10,-1,.7],[10,-1,.7]])plant(b,px,y,pz,s);
  // Integrated garden beds give the perimeter depth without filling the paths.
  for(const a of [.90,2.12,3.2,-.12]){
    const rr=10.25,lo=a-.18,hi=a+.18;
    arcBlock(b,x,z,rr-.52,rr+.48,y,.56,lo,hi,'ivory');
    arcBlock(b,x,z,rr-.47,rr+.43,y+.57,.10,lo+.01,hi-.01,'porcelain');
    arcBlock(b,x,z,rr-.36,rr+.32,y+.67,.035,lo+.025,hi-.025,'woodDark');
    for(let i=0;i<6;i++){
      const th=lo+.045+i*(hi-lo-.09)/5;
      const px=x+Math.cos(th)*rr,pz=z+Math.sin(th)*rr;
      ellipsoid(b,[px,y+.95,pz],[.30,.43,.31],i%3?'leaf':'leafLight',[.1,th,.1],10);
      ellipsoid(b,[px+Math.cos(th)*.24,y+.89,pz+Math.sin(th)*.24],[.19,.29,.21],'leafDark',[.2,th,.2],10);
    }
  }
  // Low arrival steps in the front opening.
  for(let i=0;i<3;i++)box(b,[0,y-.1-i*.23,7.7+i*.42],[3.0+i*.2,.24,.88],'ivory',.055);
}
function bowl(b,x,z,y){
  const rx=6.25,rz=5.6,depth=2.05,n=72;
  const profile=[[0,-depth],[.25,-depth],[.44,-depth+.03],[.61,-depth+.16],
    [.74,-depth+.46],[.86,-depth+.94],[.95,-depth+1.51],[1,0],[1.06,.06],[1.10,.08]];
  // Each strip has smooth profile normals, with distinct palette bands.
  for(let j=0;j<profile.length-1;j++)for(let segment=0;segment<12;segment++){
    const verts=[],ix=[],a0=segment*TAU/12,a1=(segment+1)*TAU/12;
    for(let i=0;i<=6;i++)for(const k of [j,j+1]){
      const a=a0+(a1-a0)*i/6,[r,h]=profile[k],warp=1+.075*Math.sin(a*3);
      verts.push([x+Math.cos(a)*rx*r*warp,y+h,z+Math.sin(a)*rz*r]);
    }
    for(let i=0;i<6;i++){const k=i*2;ix.push(k,k+3,k+1,k,k+2,k+3);}
    const col=j>=8?'ivory':j===7?'gold':j<=2?'sky':
      segment>=8&&segment<=10?'salmon':segment===1||segment===2?'ivory':'blue';
    b.add(geometry(verts,ix),col);
  }
  const ring=Array.from({length:n},(_,i)=>{const a=i*TAU/n;return[x+Math.cos(a)*rx*1.055*(1+.075*Math.sin(a*3)),y+.11,z+Math.sin(a)*rz*1.055];});
  tube(b,ring,.075,'porcelain',false,true);
  return {x,z,rx,rz,depth,lipY:y};
}
function skate(b,config){
  const s=SITES.skate,{x,z,y}=s,bcx=x+1.1,bcz=z+.5;
  const hole=Array.from({length:72},(_,i)=>{const a=i*TAU/72;return[bcx+Math.cos(a)*6.25*1.10*(1+.075*Math.sin(a*3)),bcz+Math.sin(a)*5.6*1.10];});
  island(b,s,[hole]);bowl(b,bcx,bcz,y);
  perimeter(b,s,[Math.atan2(SITES.hub.z-z,SITES.hub.x-x),Math.PI/2],false);
  // The back terrace is a single composed seating edge, not a ring of props.
  for(let i=0;i<3;i++)box(b,[x,y+.15+i*.27,z-7.65-i*.36],[11.8-i*.5,.30,2.1-i*.35],i%2?'ivory':'peach',.09);
  for(const off of [-3.8,2.8]){
    box(b,[x+off,y+1.08,z-8.1],[2.7,.24,.74],'coral',.12);
    box(b,[x+off,y+1.48,z-8.48],[2.8,.73,.2],'ivory',.07);
  }
  // Solid curved kicker with modeled cheek supports.
  const shape=new THREE.Shape();shape.moveTo(-2,0);shape.lineTo(2,0);shape.lineTo(2,1.35);
  shape.quadraticCurveTo(-.6,.02,-2,.12);shape.closePath();
  const ramp=new THREE.ExtrudeGeometry(shape,{depth:1.8,steps:1,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2,curveSegments:16});
  b.add(ramp,'sky',[x-5.1,y+.035,z-6.4],[0,0,0]);
  box(b,[x-7.2,y+.28,z+4.1],[1.1,.55,3.5],'salmon',.1);
  box(b,[x-7.2,y+.60,z+4.1],[1.18,.10,3.6],'porcelain',.04);
  bar(b,[x-7.2,y+.63,z+2.4],[x-7.2,y+1.10,z+2.4],.065,'ink');
  bar(b,[x-7.2,y+.63,z+5.5],[x-7.2,y+1.10,z+5.5],.065,'ink');
  bar(b,[x-7.2,y+1.10,z+2.4],[x-7.2,y+1.10,z+5.5],.09,'blue');
  for(const [dx,dz] of [[-6.0,-7],[6.8,-6.6],[7.4,5.8]]){
    plant(b,x+dx,y,z+dz,.8);if(config.greenery&&dz<0)palm(b,x+dx+.3,y,z+dz+.7,3.5,dx);
  }
  skateboard(b,x-5,y+.17,z+6.2,.35);
}
function umbrella(b,x,y,z,r=1.8,color='coral'){
  bar(b,[x,y,z],[x,y+2.65,z],.06,'wood');
  cylinder(b,[x,y,z],.34,.12,'ivory',.31,14);
  const n=12,rows=[[0,2.8],[.32,2.73],[.72,2.48],[1,2.23]];
  for(let k=0;k<n;k++){
    const v=[],ix=[];
    for(let j=0;j<rows.length;j++)for(let i=0;i<=3;i++){
      const t=i/3,a=(k+t)*TAU/n,[rr,h]=rows[j];
      v.push([x+Math.cos(a)*rr*r,y+h-(j===rows.length-1?.075*Math.sin(t*Math.PI):0),z+Math.sin(a)*rr*r]);
    }
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<3;i++){const t=j*4+i;ix.push(t,t+5,t+4,t,t+1,t+5);}
    const g=geometry(v,ix);b.add(g,k%2?'ivory':color);
    // Underside uses real reversed geometry rather than a double-sided shader.
    const vv=v.map(p=>[p[0],p[1]-.035,p[2]]),ii=[];
    for(let i=0;i<ix.length;i+=3)ii.push(ix[i],ix[i+2],ix[i+1]);
    b.add(geometry(vv,ii),'cream');
    const a=k*TAU/n;bar(b,[x,y+2.68,z],[x+Math.cos(a)*r*.97,y+2.19,z+Math.sin(a)*r*.97],.018,'wood');
  }
  ellipsoid(b,[x,y+2.84,z],[.10,.10,.10],'gold');
}
function lounger(b,x,y,z,yaw=0,col='sky'){
  const cs=Math.cos(yaw),sn=Math.sin(yaw),p=(a,h,d)=>[x+a*cs+d*sn,y+h,z-a*sn+d*cs];
  box(b,p(0,.37,.24),[.84,.10,1.45],col,.045,yaw);
  box(b,p(0,.72,-.70),[.84,.10,.91],col,.045,yaw,-.92);
  for(const side of [-1,1]){
    bar(b,p(side*.48,.31,.96),p(side*.48,.31,-.38),.055,'wood');
    bar(b,p(side*.48,.31,-.38),p(side*.48,1.13,-.95),.055,'wood');
    for(const d of [-.25,.8])bar(b,p(side*.4,0,d+.12),p(side*.48,.34,d),.048,'woodDark');
  }
}
function kiosk(b,x,y,z){
  box(b,[x,y+.12,z],[4.6,.24,3.25],'wood',.09);
  for(const dx of [-2,2])for(const dz of [-1.3,1.3]){
    box(b,[x+dx,y+1.35,z+dz],[.20,2.6,.20],'woodDark',.035);
    box(b,[x+dx,y+.25,z+dz],[.32,.5,.32],'ivory',.04);
  }
  box(b,[x,y+1.2,z-1.2],[4,2.2,.16],'teal',.06);
  for(let i=0;i<9;i++)box(b,[x-1.8+i*.45,y+1.1,z-1.08],[.065,1.9,.04],'aqua',.012);
  box(b,[x,y+.72,z+.95],[3.85,1.15,.56],'ivory',.10);
  box(b,[x,y+1.35,z+1.03],[4.2,.17,.85],'wood',.07);
  for(let i=0;i<8;i++)box(b,[x-1.72+i*.49,y+.72,z+1.25],[.25,.85,.04],i%2?'peach':'salmon',.02);
  // Broad opaque striped curved canopy, with a continuous finished underside.
  for(let i=0;i<12;i++){
    const x0=x-2.35+i*4.7/12,x1=x0+4.7/12;
    const vs=[],ix=[];
    for(let j=0;j<=12;j++)for(const xx of [x0,x1]){
      const t=j/12;vs.push([xx,y+2.55+.62*Math.sin(Math.PI*t),z-1.6+t*3.45]);
    }
    for(let j=0;j<12;j++){const k=j*2;ix.push(k,k+3,k+1,k,k+2,k+3);}
    b.add(geometry(vs,ix),i%3?'ivory':'coral');
  }
  box(b,[x,y+2.57,z+1.82],[4.8,.27,.17],'coral',.06);
  for(let i=0;i<4;i++){
    cylinder(b,[x-1.12+i*.7,y+1.44,z+.9],.12,.32,['blue','gold','coral','mint'][i],.10,10);
    cylinder(b,[x-1.12+i*.7,y+1.76,z+.9],.13,.04,'porcelain',.13,10);
  }
  // Round lifebuoy icon, modeled rather than a text sign.
  const ring=new THREE.TorusGeometry(.32,.09,8,28);
  b.add(ring,'ivory',[x,y+1.85,z-1.01]);
}
function beach(b,config){
  const s=SITES.beach,{x,z,y}=s;island(b,s,[],true);
  kiosk(b,x-2.2,y,z-3.0);
  umbrella(b,x-3.2,y,z+2.6,1.8,'coral');
  umbrella(b,x+2.0,y,z+3.4,1.75,'blue');
  for(const [dx,dz,a,c] of [[-4,3,.08,'ivory'],[-2.3,3.0,-.12,'salmon'],[1.1,3.8,-.13,'sky'],[2.9,3.9,.15,'ivory']])lounger(b,x+dx,y,z+dz,a,c);
  for(const [dx,dz] of [[-3.1,4.8],[2,5.5]]){
    cylinder(b,[x+dx,y,z+dz],.10,.46,'woodDark',.09,10);
    cylinder(b,[x+dx,y+.46,z+dz],.42,.09,'porcelain',.42,20);
  }
  if(config.greenery)for(const [dx,dz,h,a] of [[-6.4,-1,4.3,.5],[-5,-4.7,3.7,.3],[4.3,-4.5,4.0,2.1],[5.9,2.0,3.5,2.8]])palm(b,x+dx,y,z+dz,h,a);
  for(const [dx,dz,s] of [[-6,-4.8,.65],[-6.7,-3,.7],[5.0,-5,.8],[6,2.5,.65]])plant(b,x+dx,y,z+dz,s);
  // Landing stair ties the high bridge to the low beach, with no floating tread.
  const dx=SITES.hub.x-x,dz=SITES.hub.z-z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,yaw=Math.atan2(-uz,ux);
  const stairCount=Math.ceil((.71-y)/.28),rise=(.71-y)/stairCount;
  for(let i=0;i<stairCount;i++){
    const t=7.9-i*.40,top=.71-i*rise,h=top-y;
    box(b,[x+ux*t,y+h/2,z+uz*t],[.62,h,3.4],'ivory',.04,yaw);
  }
  // Sand pavers lead inward from the last step.
  for(let i=0;i<4;i++){const t=7.9-stairCount*.40-i*.65;box(b,[x+ux*t,y+.035,z+uz*t],[.62,.06,1.3],'cream',.045,yaw);}
  // Small grounded boardwalk and dock.
  const dockX=x+5.0,dockZ=z+6.2;
  for(let i=0;i<13;i++)box(b,[dockX,y+.08,dockZ+i*.38],[2.05,.14,.34],i%3?'wood':'sand',.025);
  for(let i=0;i<4;i++)for(const side of [-1,1]){
    cylinder(b,[dockX+side*1.0,SEA-.4,dockZ+i*1.5],.12,y-SEA+1.0,'woodDark',.10,10);
    cylinder(b,[dockX+side*1.0,y+.57,dockZ+i*1.5],.14,.08,'cream',.14,10);
  }
  for(const side of [-1,1])bar(b,[dockX+side,y+.4,dockZ+3],[dockX+side,y+.4,dockZ+4.5],.035,'cream');
  // A little opaque-shell rowboat alongside the dock.
  const bx=dockX-2.1,bz=dockZ+3.3,by=SEA+.16;
  const outline=[[-.65,-1.2],[0,-1.85],[.65,-1.2],[.72,.85],[.45,1.3],[-.45,1.3],[-.72,.85]].map(([a,d])=>[bx+a,bz+d]);
  slab(b,outline,[],by+.42,.65,'blue',.12);
  slab(b,outline.map(([a,d])=>[bx+(a-bx)*.79,bz+(d-bz)*.83]),[],by+.44,.06,'ink',.06);
  for(const off of [-.65,.50])box(b,[bx,by+.53,bz+off],[1.15,.11,.32],'wood',.03);
  bar(b,[bx-.7,by+.57,bz-.9],[bx+.9,by+.61,bz+.7],.035,'wood');
  for(const [dx,dz,ss] of [[-6,3.5,.4],[4.6,4,.27],[.3,2,.36]]){
    const g=new THREE.SphereGeometry(ss,16,10);b.add(g,dx<0?'coral':'gold',[x+dx,y+ss,z+dz]);
  }
}
function skateboard(b,x,y,z,yaw=0){
  box(b,[x,y+.10,z],[.39,.08,1.05],'coral',.065,yaw);
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  for(const side of [-1,1])for(const end of [-1,1])ellipsoid(b,[x+side*.22*cs+end*.32*sn,y,z-side*.22*sn+end*.32*cs],[.09,.09,.09],'ink');
}
function bridge(b,a,c){
  const dx=c.x-a.x,dz=c.z-a.z,dist=Math.hypot(dx,dz),ux=dx/dist,uz=dz/dist;
  const start=a.r*.94,end=dist-c.r*.90,len=end-start,mid=(start+end)/2,y=.65,yaw=Math.atan2(-uz,ux);
  const pt=(t,w,h=y)=>[a.x+ux*t-uz*w,h,a.z+uz*t+ux*w];
  box(b,pt(mid,0,y-.22),[len+.45,.43,3.25],'ivory',.12,yaw);
  for(let i=0;i<Math.ceil(len/.6);i++){
    const t=start+(i+.5)*len/Math.ceil(len/.6);
    box(b,pt(t,0,y+.03),[len/Math.ceil(len/.6)-.028,.06,2.98],i%4?'porcelain':'peach',.015,yaw);
  }
  for(const side of [-1,1]){
    const points=[start,mid,end].map(t=>pt(t,side*1.58,y+.93));tube(b,points,.09,'sky');
    bar(b,pt(start,side*1.58,y+.45),pt(end,side*1.58,y+.45),.035,'ivory');
    for(const t of [start,mid,end]){
      bar(b,pt(t,side*1.58,y-.1),pt(t,side*1.58,y+.9),.075,'ivory');
      if(t!==mid)bollard(b,...[pt(t,side*1.72)[0],y,pt(t,side*1.72)[2]]);
    }
    for(const t of [start+.35,end-.35]){
      const p=pt(t,side*1.1,SEA-.25);cylinder(b,p,.28,y-SEA+.03,'stoneLight',.32,12);
    }
  }
  return {from:a===SITES.hub?'hub':'unknown',to:c===SITES.skate?'skate':'beach',width:3.25,start:pt(start,0),end:pt(end,0)};
}
function sea(b){
  const n=38,size=180,v=[],ix=[];
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)v.push([(i/n-.5)*size,SEA-.035,(j/n-.5)*size]);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;ix.push(k,k+n+2,k+1,k,k+n+1,k+n+2);}
  b.add(geometry(v,ix),'sea');
  // Sparse opaque wavelets, physically separated from the water surface.
  const rnd=seeded(411);
  for(let i=0;i<150;i++){
    const x=(rnd()-.5)*108,z=(rnd()-.5)*84;
    if(Object.values(SITES).some(s=>Math.hypot(x-s.x,z-s.z)<s.r*1.23))continue;
    const length=.25+rnd()*.75;
    box(b,[x,SEA+.008,z],[length,.018,.035],i%4?'seaLight':'foam',.007,.25+rnd()*.2);
  }
}
function rocks(b,config){
  const rnd=seeded(config.seed);
  for(const [x,z,r,h] of [[-17,-17,2.2,1.9],[17,-18,2.9,2.6],[7,17,1.7,1.5],[-34,-2,2.0,1.8],[33,-9,2.2,2.4],[-5,20,1.1,1.3]]){
    const y=SEA+h*.45;
    for(let k=0;k<4;k++)b.add(new THREE.DodecahedronGeometry(1,0),k%2?'stoneLight':'stone',
      [x+Math.cos(k*1.8)*r*.3,y,z+Math.sin(k*1.8)*r*.3],[.1,k,.15],[r*.72,h,r*.72]);
    ellipsoid(b,[x,y+h*.78,z],[r*.65,.15,r*.60],'grass');
    if(config.greenery)palm(b,x,y+h*.83,z,2.1+rnd()*.3,x);
  }
}
function bean(b,x,y,z,col,hat='blue',yaw=0){
  const cs=Math.cos(yaw),sn=Math.sin(yaw),p=(a,h,d)=>[x+a*cs+d*sn,y+h,z-a*sn+d*cs];
  // Scale figures only, not a substitute for the untouched DuderLab asset rig.
  ellipsoid(b,p(0,.64,0),[.32,.52,.25],col,[0,yaw,0],16);
  for(const sign of [-1,1]){
    ellipsoid(b,p(sign*.16,.14,0),[.14,.19,.18],col);
    ellipsoid(b,p(sign*.34,.55,0),[.13,.30,.13],col,[0,yaw,sign*.72]);
    ellipsoid(b,p(sign*.105,.84,.227),[.035,.055,.035],'black');
  }
  cylinder(b,p(0,1.08,0),.34,.11,hat,.29,20);
  ellipsoid(b,p(0,1.17,0),[.28,.13,.24],hat);
  if(col==='blue'||col==='gold')for(const sign of [-1,1]){
    box(b,p(sign*.11,.85,.26),[.18,.11,.06],'ink',.035,yaw);
  }
}
export function buildCoast(materials,options={}){
  const config={seed:20261027,greenery:true,...options};
  if(!Number.isFinite(config.seed))throw Error('seed must be finite');
  const root=new THREE.Group();root.name='DuderWorld_Coast_v0_5';
  root.userData={version:COAST_VERSION,units:'meters',upAxis:'+Y',scope:'static environment prototype',seed:config.seed};
  const chunks={};
  for(const [name,fn] of [['hub',hub],['skate',skate],['beach',beach],['offshore',rocks]]){
    const b=new Batch(name);fn(b,config);const g=b.finish(materials);root.add(g);chunks[name]=g;
  }
  const bridges=new Batch('bridges');
  const bridgeData=[bridge(bridges,SITES.hub,SITES.skate),bridge(bridges,SITES.hub,SITES.beach)];
  root.add(bridges.finish(materials));
  const water=new Batch('ocean');sea(water);const ocean=water.finish(materials);
  ocean.traverse(o=>{if(o.isMesh)o.castShadow=false;});root.add(ocean);
  const anchors=new THREE.Group();anchors.name='Anchors';
  for(const [name,p] of Object.entries({HubSpawn:[0,.65,4.3],SkateSpawn:[17.3,.65,9],BeachSpawn:[-22,SITES.beach.y,9],PortalBlue:[-3.5,1.35,-10.8],PortalGold:[0,1.35,-10.8],PortalPink:[3.5,1.35,-10.8]})){
    const obj=new THREE.Object3D();obj.name=name;obj.position.fromArray(p);anchors.add(obj);
  }
  root.add(anchors);
  const people=new Batch('preview_scale_figures');
  for(const [x,z,c,h,a] of [[-4,1,'blue','ink',.4],[4,1.5,'pink','ivory',-.6],[1,4.8,'gold','wood',-.3],[-3,-7,'aqua','ivory',1.7],[4,-7,'coral','gold',-1.9],[7,4,'violet','ink',1],[-7,-3,'mint','white',-.8]])bean(people,x,.70,z,c,h,a);
  bean(people,22,-1.12,5.2,'aqua','ink',.4);skateboard(people,22,-1.31,5.2,.4);
  bean(people,16.4,.7,8.5,'coral','navy',1);
  bean(people,24,.7,12.5,'gold','black',-1.2);
  bean(people,-22,SITES.beach.y+.05,9,'violet','coral',.8);
  bean(people,-17.5,SITES.beach.y+.05,11.3,'aqua','ivory',-.2);
  const crowd=people.finish(materials);crowd.name='Preview_figures_NOT_EXPORTED';
  const stats={triangles:0,vertices:0,draws:0,materials:2,atlasSize:128};
  root.traverse(o=>{if(o.isMesh){stats.draws++;stats.triangles+=o.geometry.index.count/3;stats.vertices+=o.geometry.attributes.position.count;}});
  const metadata={...root.userData,sites:SITES,bridges:bridgeData,stats,anchors:Object.fromEntries(anchors.children.map(a=>[a.name,a.position.toArray()])),
    rendering:{opaque:true,transparentMaterials:0,paletteAtlas:'128x128',matteRoughness:.94,heroRoughness:.82,metalness:0},
    notes:['Preview figures are not DuderLab rigs and are excluded from GLB.','No colliders, gameplay or Unity package included.','Static scenery includes dock, boat and skate props.']};
  return {root,crowd,stats,metadata,chunks};
}
