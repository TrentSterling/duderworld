// A small assembly for the two existing social rooms: an open arrival portal,
// flush floor inlays and a sea-facing two-chair nook. No extra render batches.
import {roundedBox} from './sculpted-primitives.mjs';
import {roundedArc} from './soft-architecture.mjs';
import {lathe} from './world.mjs';
const TAU=Math.PI*2,v=(p,n,c)=>({p,n,c});
function frame(b,x,z,angle){
 const c=Math.cos(angle),s=Math.sin(angle);
 const point=([u,y,d])=>[x-u*s+d*c,y,z+u*c+d*s];
 const rotate=([u,y,d])=>[-u*s+d*c,y,u*c+d*s];
 const cv=a=>({...a,p:point(a.p),n:rotate(a.n)});
 return {point,b:{tri(...a){b.tri(...a.map(cv));},quad(...a){b.quad(...a.map(cv));}}};
}
function inset(b,u,d,width,depth,radius,y,color){
 const pts=[];
 for(const [cx,cz,start] of [[width/2-radius,depth/2-radius,0],[-width/2+radius,depth/2-radius,Math.PI/2],[-width/2+radius,-depth/2+radius,Math.PI],[width/2-radius,-depth/2+radius,Math.PI*1.5]])
  for(let i=0;i<=6;i++){const a=start+i*Math.PI/12;pts.push([u+cx+radius*Math.cos(a),y,d+cz+radius*Math.sin(a)]);}
 for(let i=0;i<pts.length;i++)b.tri(v([u,y,d],[0,1,0],color),v(pts[i],[0,1,0],color),v(pts[(i+1)%pts.length],[0,1,0],color));
}
function portal(b,depth,ceramic,trim){
 // Rounded shoulders join straight piers and a broad header continuously.
 const path=[[-3.2,.05,-1,0],[-3.2,3.35,-1,0]];
 for(let i=1;i<=8;i++){const a=Math.PI-i*Math.PI/16;path.push([-2.3+.9*Math.cos(a),3.35+.9*Math.sin(a),Math.cos(a),Math.sin(a)]);}
 path.push([2.3,4.25,0,1]);
 for(let i=1;i<=8;i++){const a=Math.PI/2-i*Math.PI/16;path.push([2.3+.9*Math.cos(a),3.35+.9*Math.sin(a),Math.cos(a),Math.sin(a)]);}
 path.push([3.2,.05,1,0]);
 const profile=[];
 for(let j=0;j<4;j++)for(let k=0;k<=2;k++){
  const a=j*Math.PI/2+k*Math.PI/4,cs=Math.cos(a),sn=Math.sin(a);
  profile.push({q:(j===0||j===3?.22:-.22)+.10*cs,d:(j<2?.28:-.28)+.10*sn,nq:cs,nd:sn});
 }
 const rows=path.map(([u,y,nx,ny])=>profile.map(p=>v([u+p.q*nx,y+p.q*ny,depth+p.d],[p.nq*nx,p.nq*ny,p.nd],p.d<-.25?trim:ceramic)));
 for(let i=0;i<rows.length-1;i++)for(let j=0;j<profile.length;j++)b.quad(rows[i][j],rows[i+1][j],rows[i+1][(j+1)%profile.length],rows[i][(j+1)%profile.length]);
 for(const k of [0,rows.length-1])for(let j=0;j<profile.length;j++)b.tri(v([path[k][0],.05,depth],[0,-1,0],ceramic),{...rows[k][j],n:[0,-1,0]},{...rows[k][(j+1)%profile.length],n:[0,-1,0]});
 for(const u of [-3.2,3.2])roundedBox(b,[u,.15,depth],[.84,.26,1.0],.08,trim,3);
 // A recessed plaque is visible from the bridge without blocking the opening.
 roundedBox(b,[0,4.24,depth+.40],[2.4,.42,.12],.05,trim,3);
 for(let i=-2;i<=2;i++)roundedBox(b,[i*.28,4.24,depth+.477],[.10,.15+.12*(1-Math.abs(i)/2),.025],.012,ceramic,2);
}
function leaningBack(b,center,size,r,color){
 const angle=-.18,c=Math.cos(angle),s=Math.sin(angle);
 const rot=([x,y,z])=>[x,y*c-z*s,y*s+z*c];
 const cv=a=>({...a,p:rot(a.p).map((n,i)=>n+center[i]),n:rot(a.n)});
 roundedBox({tri(...a){b.tri(...a.map(cv));},quad(...a){b.quad(...a.map(cv));}},[0,0,0],size,r,color,5);
}
export function arrivalTerrace(b,{x,z,entrances,balconyAngle,ceramic,fabric,dark,ivory}){
 const keepouts=[],assemblies={arrival:null,terrace:null};
 const clear=(p,r)=>entrances.every(a=>{
  const dx=p[0]-x,dz=p[2]-z,along=dx*Math.cos(a)+dz*Math.sin(a);
  return along<3||along>14.5||Math.abs(-dx*Math.sin(a)+dz*Math.cos(a))>1.5+r+.36;
 });
 const keep=(p,r,kind)=>keepouts.push({x:p[0],z:p[2],radius:r,kind});
 if(entrances.length){
  const angle=entrances[0],f=frame(b,x,z,angle),depth=10.65;
  inset(f.b,0,10.7,6.1,4.1,.9,.048,dark);
  inset(f.b,0,10.7,5.84,3.84,.78,.052,ceramic);
  const legs=[f.point([-3.2,0,depth]),f.point([3.2,0,depth])];
  if(legs.every(p=>clear(p,.67))){
   portal(f.b,depth,ivory,dark);legs.forEach(p=>keep(p,.67,'arrival-pier'));
   assemblies.arrival={angle,depth,clearWidth:5.72,clearHeight:3.93};
  }
 }
 const a=balconyAngle,f=frame(b,x,z,a);
 // This remains on the existing island, between the room opening and its rim.
 inset(f.b,0,10.4,7.5,3.1,1.3,.060,dark);
 inset(f.b,0,10.4,7.26,2.86,1.18,.064,ceramic);
 let chairs=0;
 for(const side of [-1,1]){
  const u=side*2.45,d=10.75,p=f.point([u,0,d]);if(!clear(p,.91))continue;
  roundedBox(f.b,[u,.20,d],[1.0,.30,1.12],.13,dark,5);
  roundedBox(f.b,[u,.46,d],[1.24,.28,1.24],.13,fabric,5);
  leaningBack(f.b,[u,.92,d-.47],[1.24,.82,.30],.14,fabric);
  leaningBack(f.b,[u,1.02,d-.29],[.76,.56,.19],.09,ivory);
  keep(p,.91,'terrace-chair');chairs++;
 }
 const table=f.point([3.55,0,10.45]);
 if(clear(table,.52)){
  lathe(b,table[0],table[2],[[.29,.065,dark],[.34,.16,dark],[.21,.24,ceramic],[.19,.57,ceramic],[.48,.62,ivory],[.50,.71,ivory],[.44,.77,ivory]],20);
  lathe(b,table[0],table[2],[[.10,.77,dark],[.13,.79,dark],[.13,.94,dark],[.10,.96,ivory]],12);
  keep(table,.52,'terrace-side-table');
 }
 // Broad lookout ledge, integrated with the existing parapet. Omit it if an
 // unusual graph routes a bridge through this sea-facing opening.
 const ledgePoints=Array.from({length:13},(_,i)=>{const q=a-.28+i*.56/12;return[x+12.44*Math.cos(q),0,z+12.44*Math.sin(q)];});
 if(ledgePoints.every(p=>clear(p,.44))){
  roundedArc(b,{x,z,r:12.44,width:.76,y0:.69,y1:.96,a0:a-.28,a1:a+.28,bevel:.085,color:ivory,detail:28});
  ledgePoints.forEach(p=>keep(p,.44,'terrace-parapet'));
 }
 assemblies.terrace={angle:a,chairs,depth:10.75,objectClearWidth:3.08,walkClearWidth:2.40};
 return {keepouts,...assemblies};
}
