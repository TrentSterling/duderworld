// Original small botanical kit. Curved leaf blades, petioles and turned pots;
// vertex colours, opaque surfaces, no alpha cards or textures. Kept separate
// from V0.2 recipes so old Duder Lab / lobby exports remain reproducible.
import {lathe,makeRandom} from './world.mjs';
const TAU=Math.PI*2;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s),norm=a=>mul(a,1/(Math.hypot(...a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t),v=(p,n,c)=>({p,n,c});
export const BOTANICAL={jade:[53,132,113],leaf:[88,166,128],young:[166,200,137],vein:[190,211,145],stem:[64,117,91],soil:[106,89,97],ceramic:[239,211,181],rim:[252,232,207],foot:[165,118,105]};

export function curvedStem(b,points,radius,color=BOTANICAL.stem,sides=6){
 const rings=points.map((p,i)=>{
  const tangent=norm(sub(points[Math.min(points.length-1,i+1)],points[Math.max(0,i-1)]));
  const u=norm(cross(tangent,Math.abs(tangent[1])>.9?[1,0,0]:[0,1,0])),w=cross(tangent,u);
  return Array.from({length:sides},(_,j)=>{const a=TAU*j/sides,n=add(mul(u,Math.cos(a)),mul(w,Math.sin(a)));
   return v(add(p,mul(n,radius*(1-.62*i/(points.length-1)))),n,color);});
 });
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++)b.quad(rings[i][j],rings[i][(j+1)%sides],rings[i+1][(j+1)%sides],rings[i+1][j]);
 for(const [i,dir] of [[0,-1],[points.length-1,1]]){
  const n=mul(norm(sub(points.at(-1),points[0])),dir);
  for(let j=0;j<sides;j++)b.tri(v(points[i],n,color),{...rings[i][j],n},{...rings[i][(j+1)%sides],n});
 }
}

// A leaf is a swept, cupped lamina. Its silhouette tapers at the base and tip,
// with asymmetric broad shoulders, a raised midrib and a drooping tip.
export function leafBlade(b,{root,angle,length,width,rise=.5,droop=.4,curl=.12,color=BOTANICAL.leaf,lobes=0,steps=9,thickness=.014,widthSteps=2}){
 const forward=[Math.cos(angle),0,Math.sin(angle)],side=[-Math.sin(angle),0,Math.cos(angle)];
 const at=(t,u,lower=false)=>{
  const envelope=t<=0||t>=1?0:Math.pow(Math.sin(Math.PI*t),.74)*(1+.18*Math.sin(Math.PI*t*2));
  const notch=1-lobes*.22*(.5+.5*Math.cos(t*Math.PI*8))*(t>.25&&t<.9?1:0);
  const w=width*envelope*notch*u*.5;
  return add(root,add(mul(forward,length*t),add(mul(side,w),[0,
   rise*Math.sin(t*Math.PI*.72)-droop*t*t+curl*(1-u*u)*envelope-(lower?thickness:0),0])));
 };
 const rows=[];
 for(const lower of [false,true]){
  const grid=[];
  for(let i=0;i<=steps;i++){
   const t=i/steps,row=[];
   // Keep every silhouette station and the central rib. Extra subdivisions
   // across this shallow cup do not improve the outline, even close up.
   for(let j=0;j<=widthSteps;j++){
    const u=j/widthSteps*2-1,dt=.001,du=.001;
    const normalT=Math.max(.002,Math.min(.998,t));
    let n=norm(cross(sub(at(normalT,u+du,lower),at(normalT,u-du,lower)),sub(at(normalT+dt,u,lower),at(normalT-dt,u,lower))));
    if(n[1]<0)n=mul(n,-1);if(lower)n=mul(n,-1);
    const mid=j===widthSteps/2;
    const c=lower?mix(color,BOTANICAL.jade,.3):mix(color,mid?BOTANICAL.vein:BOTANICAL.jade,mid?.19:.10);
    row.push(v(at(t,u,lower),n,c));
   }grid.push(row);
  }
  for(let i=0;i<steps;i++)for(let j=0;j<widthSteps;j++)b.quad(grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]);
  rows.push(grid);
 }
 // Thin opaque edge joins. Top/bottom meet at their tapered endpoints.
 for(let i=0;i<steps;i++)for(const j of [0,widthSteps]){
  const a=rows[0][i][j],c=rows[0][i+1][j],d=rows[1][i+1][j],e=rows[1][i][j];
  const n=norm(cross(sub(c.p,a.p),sub(d.p,a.p)));
  b.quad({...a,n},{...c,n},{...d,n},{...e,n});
 }
}

export function ceramicPlanter(b,x,z,s=1,seed=1,{baseY=0,hero=false,potColor}={}){
 const C=BOTANICAL,rand=makeRandom(seed),pot=potColor||C.ceramic;
 const profile=[[.34,0,C.foot],[.40,.06,C.foot],[.41,.13,C.foot],[.44,.16,pot],
  [.48,.25,pot],[.53,.64,pot],[.54,.75,C.rim],[.53,.80,C.rim],
  [.46,.80,C.rim],[.45,.74,C.rim],[.44,.68,C.soil],[0,.68,C.soil]];
 lathe(b,x,z,profile.map(([r,y,c])=>[r*s,baseY+y*s,c]),hero?24:18,false,true);
 // A small foot and two glazed bands make the vessel an assembly.
 lathe(b,x,z,[[.511*s,baseY+.40*s,pot],[.515*s,baseY+.43*s,C.rim],[.519*s,baseY+.46*s,pot]],hero?24:18,false,false);
 if(!hero&&Math.abs(seed)%2===0){
  for(let i=0;i<9;i++){
   const level=i<5?0:1,a=i*2.39996;
   const root=[x+Math.cos(a)*.07*s,baseY+(.75+level*.19)*s,z+Math.sin(a)*.07*s];
   leafBlade(b,{root,angle:a,length:(level?.44:.68)*s,width:.39*s,rise:(level?.49:.23)*s,
    droop:.20*s,curl:.09*s,color:[C.leaf,C.young,[119,178,151]][i%3],steps:8,thickness:.025*s});
  }
  return;
 }
 const count=hero?8:6;
 for(let i=0;i<count;i++){
  const a=i*2.39996+rand()*.25,level=i/count;
  const start=[x+Math.cos(a)*.13*s,baseY+.68*s,z+Math.sin(a)*.13*s];
  const height=(.50+level*.68)*s,spread=(.16+level*.06)*s;
  const root=[x+Math.cos(a)*spread,baseY+.70*s+height,z+Math.sin(a)*spread];
  curvedStem(b,[start,[start[0],baseY+(.82+level*.45)*s,start[2]],root],.028*s,C.stem);
  leafBlade(b,{root,angle:a,length:(.65+rand()*.30+(hero?.16:0))*s,width:(.42+rand()*.18)*s,
   rise:(.25+level*.2)*s,droop:(.22+(1-level)*.28)*s,curl:.075*s,
   color:[C.jade,C.leaf,C.young][i%3],lobes:hero&&i%3===0?1:0,steps:hero?10:8,widthSteps:hero?4:2});
 }
}

export function islandPalm(b,x,z,height,angle=0){
 const C=BOTANICAL,points=[];
 for(let i=0;i<=9;i++){const t=i/9;points.push([x+Math.cos(angle)*.48*t*t,height*t,z+Math.sin(angle)*.48*t*t]);}
 curvedStem(b,points,.19,[174,144,112],9);
 const top=points.at(-1);
 for(let j=0;j<7;j++){
  const a=angle+TAU*j/7,len=1.6+(j%3)*.22;
  leafBlade(b,{root:top,angle:a,length:len,width:.51,rise:.64,droop:.95,curl:.09,
   color:j%3?C.leaf:C.young,lobes:1,steps:10});
 }
}
