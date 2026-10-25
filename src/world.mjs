// DuderWorld V0.2 — deterministic, dependency-free architectural lobby geometry.
// World coordinates: X across the room, Y up, Z towards the north staircase.
// Every surface emits indexed position / normal / COLOR_0 records.

export const DEFAULT_RECIPE = Object.freeze({
  width: 32, depth: 24, plazaRadius: 5.7, portalWidth: 4.55,
  archThickness: 0.57, benchRadius: 2.6, facets: 24, seed: 1702468274,
});

const C = Object.freeze({
  cream: [245, 230, 201], ivory: [255, 245, 218], warm: [255, 221, 185],
  pink: [250, 147, 139], coral: [239, 109, 100], gold: [254, 198, 87],
  yellow: [255, 218, 109], cyan: [63, 196, 200], blue: [122, 186, 230],
  paleBlue: [188, 219, 239], lavender: [193, 157, 234], mint: [159, 224, 183],
  leaf: [85, 173, 99], leafLight: [135, 202, 97], leafDark: [45, 136, 90],
  soil: [158, 126, 93], white: [253, 245, 230], portalGold: [255, 225, 113],
  portalViolet: [221, 165, 255], water: [104, 203, 241], deepBlue: [77, 145, 212],
  tileLight: [249, 238, 219], tileCool: [232, 233, 221], peach: [255, 181, 156],
  rose: [249, 122, 123], sea: [52, 198, 204], midnight: [71, 119, 172],
  lilac: [167, 109, 240], lamp: [255, 241, 164],
});

const TAU = Math.PI * 2;
const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
const add = (a,b) => a.map((v,i)=>v+b[i]);
const mul = (a,s) => a.map(v=>v*s);
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = v => {const l=Math.hypot(...v);return l>1e-12?mul(v,1/l):[0,1,0]};
const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);

class MeshBucket {
  constructor(name) {this.name=name;this.positions=[];this.normals=[];this.colors=[];this.indices=[];this.lookup=new Map();this.parts=[];}
  vertex(p,n,c) {
    const normal=norm(n),color=c.map(v=>clamp(Math.round(v),0,255));
    // This weld key deliberately includes normal/color seams: geometrically
    // coincident but visually incompatible records must stay separate.
    const q=v=>Math.round(v*100000);
    const key=p.map(q).join(',')+'|'+normal.map(v=>Math.round(v*10000)).join(',')+'|'+color.join(',');
    let i=this.lookup.get(key);if(i!==undefined)return i;
    i=this.positions.length/3;this.lookup.set(key,i);
    this.positions.push(...p);this.normals.push(...normal);this.colors.push(...color);return i;
  }
  tri(a,b,c){
    const x=sub(b.p,a.p),y=sub(c.p,a.p),face=cross(x,y);
    if(dot(face,face)<1e-16)return;
    const n=norm(add(add(a.n,b.n),c.n));
    if(dot(face,n)<0)[b,c]=[c,b];
    this.indices.push(this.vertex(a.p,a.n,a.c),this.vertex(b.p,b.n,b.c),this.vertex(c.p,c.n,c.c));
  }
  quad(a,b,c,d){this.tri(a,b,c);this.tri(a,c,d);}
  part(name,fn){const start=this.indices.length;fn();this.parts.push({name,triangles:(this.indices.length-start)/3});}
  output(){return {positions:new Float32Array(this.positions),normals:new Float32Array(this.normals),colors:new Uint8Array(this.colors),indices:new Uint32Array(this.indices),parts:this.parts};}
}
const v=(p,n,c)=>({p,n,c});

// Smooth rounded blocks: project each six-sided cube grid onto the SDF of a
// bevelled box. Adjacent face records weld by position, normal, and color.
function roundedBox(b,center,size,r,color,div=5){
  const h=mul(size,.5),radius=Math.min(r,...h.map(x=>x*.95));
  const axes=[[0,1,2],[0,2,1],[1,2,0]];
  for(let k=0;k<3;k++)for(const side of [-1,1]){
    const [axis,ua,va]=axes[k],grid=[];
    for(let j=0;j<=div;j++){
      const row=[];
      for(let i=0;i<=div;i++){
        const p=[0,0,0];p[axis]=side*h[axis];p[ua]=(i/div*2-1)*h[ua];p[va]=(j/div*2-1)*h[va];
        const core=p.map((x,t)=>clamp(x,-h[t]+radius,h[t]-radius));
        const delta=sub(p,core);const n=Math.hypot(...delta)>1e-8?norm(delta):[0,0,0];
        if(Math.hypot(...delta)<=1e-8)n[axis]=side;
        row.push(v(add(center,add(core,mul(n,radius))),n,color));
      }
      grid.push(row);
    }
    for(let j=0;j<div;j++)for(let i=0;i<div;i++)b.quad(grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]);
  }
}

function lathe(b,x,z,profile,segments=20,capTop=true,capBottom=true){
  const rings=[];
  for(let j=0;j<profile.length;j++){
    const [r,y,color]=profile[j];
    const before=profile[Math.max(j-1,0)],after=profile[Math.min(j+1,profile.length-1)];
    const dr=after[0]-before[0],dy=after[1]-before[1];
    const row=[];
    for(let i=0;i<segments;i++){
      const t=TAU*i/segments,cs=Math.cos(t),sn=Math.sin(t);
      row.push(v([x+r*cs,y,z+r*sn],norm([dy*cs,-dr,dy*sn]),color));
    }
    rings.push(row);
  }
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
    const next=(i+1)%segments;
    b.quad(rings[j][i],rings[j][next],rings[j+1][next],rings[j+1][i]);
  }
  for(const [cap,up] of [[0,-1],[profile.length-1,1]]){
    if(up<0&&!capBottom||up>0&&!capTop)continue;
    const [r,y,color]=profile[cap];if(r<1e-5)continue;
    const center=v([x,y,z],[0,up,0],color);
    for(let i=0;i<segments;i++){
      const a=TAU*i/segments,d=TAU*(i+1)/segments;
      b.tri(center,v([x+r*Math.cos(a),y,z+r*Math.sin(a)],[0,up,0],color),v([x+r*Math.cos(d),y,z+r*Math.sin(d)],[0,up,0],color));
    }
  }
}

function ellipsoid(b,center,radii,color,segments=10,rings=6,rotation=0){
  const grid=[];const cr=Math.cos(rotation),sr=Math.sin(rotation);
  for(let j=0;j<=rings;j++){
    const phi=-Math.PI/2+Math.PI*j/rings,row=[];
    for(let i=0;i<segments;i++){
      const t=TAU*i/segments,q=[Math.cos(phi)*Math.cos(t),Math.sin(phi),Math.cos(phi)*Math.sin(t)];
      const p=[q[0]*radii[0],q[1]*radii[1],q[2]*radii[2]];
      const n=norm([q[0]/radii[0],q[1]/radii[1],q[2]/radii[2]]);
      const rot=a=>[a[0]*cr+a[2]*sr,a[1],-a[0]*sr+a[2]*cr];
      row.push(v(add(center,rot(p)),rot(n),color));
    }
    grid.push(row);
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++)b.quad(grid[j][i],grid[j][(i+1)%segments],grid[j+1][(i+1)%segments],grid[j+1][i]);
}

function arcBench(b,x,z,r,start,end,color,detail){
  const n=Math.max(7,Math.round((end-start)/TAU*detail)),halfW=.53,topY=.88,bottomY=.11,bev=.16;
  const profile=[[-halfW+bev,bottomY],[halfW-bev,bottomY],[halfW,bottomY+bev],[halfW,topY-bev],
    [halfW-bev,topY],[-halfW+bev,topY],[-halfW,topY-bev],[-halfW,bottomY+bev]];
  const rows=[];
  for(let i=0;i<=n;i++){
    const a=start+(end-start)*i/n,cs=Math.cos(a),sn=Math.sin(a),row=[];
    for(let j=0;j<profile.length;j++){
      const [u,h]=profile[j];const left=profile[(j-1+profile.length)%profile.length],right=profile[(j+1)%profile.length];
      const du=right[0]-left[0],dh=right[1]-left[1];
      const normal=norm([dh*cs,-du,dh*sn]);
      row.push(v([x+(r+u)*cs,h,z+(r+u)*sn],normal,color));
    }
    rows.push(row);
  }
  for(let i=0;i<n;i++)for(let j=0;j<profile.length;j++)b.quad(rows[i][j],rows[i+1][j],rows[i+1][(j+1)%profile.length],rows[i][(j+1)%profile.length]);
  for(const [i,sign] of [[0,-1],[n,1]]){
    const a=start+(end-start)*i/n,normal=[-Math.sin(a)*sign,0,Math.cos(a)*sign];
    const middle=v([x+r*Math.cos(a),(topY+bottomY)*.5,z+r*Math.sin(a)],normal,color);
    for(let j=0;j<profile.length;j++){
      const k=(j+1)%profile.length;
      b.tri(middle,v(rows[i][j].p,normal,color),v(rows[i][k].p,normal,color));
    }
  }
}

function portal(b,glow,x,z,side,opening,thickness,detail,frameColor,glowColor){
  // A single swept, closed U-shaped frame. Local width axis maps into Z;
  // local forward maps towards the center of the room on X.
  const shoulder=2.12,width=opening,half=width*.5,steps=Math.max(12,Math.round(detail*1.1));
  const path=[[-half,.15],[-half,shoulder]];
  for(let i=1;i<=steps;i++){
    const t=Math.PI-i*Math.PI/steps;
    path.push([half*Math.cos(t),shoulder+half*Math.sin(t)]);
  }
  path.push([half,.15]);
  const toWorld=([lx,y,lz])=>[x+side*lz,y,z+lx];
  const rings=[];const sides=12;
  for(let i=0;i<path.length;i++){
    const before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)];
    const t=norm([after[0]-before[0],after[1]-before[1],0]),out=[t[1],-t[0],0];
    const row=[];
    for(let j=0;j<sides;j++){
      const a=TAU*j/sides,ca=Math.cos(a),sa=Math.sin(a);
      const local=[path[i][0]+out[0]*ca*thickness,path[i][1]+out[1]*ca*thickness,sa*thickness*.95];
      const n=norm([out[0]*ca,out[1]*ca,sa/.95]);
      row.push(v(toWorld(local),norm([side*n[2],n[1],n[0]]),frameColor));
    }
    rings.push(row);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++)b.quad(rings[i][j],rings[i][(j+1)%sides],rings[i+1][(j+1)%sides],rings[i+1][j]);
  for(const [i,sign] of [[0,-1],[rings.length-1,1]]){
    const a=path[i],before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)];
    const tangent=norm([after[0]-before[0],after[1]-before[1],0]);
    const normal=norm([0,tangent[1]*sign,tangent[0]*sign]);
    const center=v(toWorld([a[0],a[1],0]),normal,frameColor);
    for(let j=0;j<sides;j++)b.tri(center,v(rings[i][j].p,normal,frameColor),v(rings[i][(j+1)%sides].p,normal,frameColor));
  }
  if(!glow)return; // Structural arch layers never duplicate the illuminated portal fill.
  // Closed fan-shaped light surface just inside the arch; not a solid doorway
  // collider. It can be replaced by the EOS session entrance later.
  const faceNormal=[-side,0,0],depth=.04;
  const fan=v(toWorld([0,shoulder*.57,depth]),faceNormal,glowColor);
  const boundary=[[-half,0],[half,0],[half,shoulder]];
  for(let i=1;i<=steps;i++){
    const t=i*Math.PI/steps;
    boundary.push([half*Math.cos(t),shoulder+half*Math.sin(t)]);
  }
  boundary.push([-half,shoulder]);
  for(let i=0;i<boundary.length;i++){
    const a=boundary[i],c=boundary[(i+1)%boundary.length];
    glow.tri(fan,v(toWorld([a[0],a[1],depth]),faceNormal,glowColor),v(toWorld([c[0],c[1],depth]),faceNormal,glowColor));
  }
}

// Swept annular wall/seat/podium: smooth on the curved faces, flat on its
// horizontal surfaces. These bands also make thick, genuinely three-dimensional
// backrests instead of extra coplanar strips glued to the cushion surfaces.
function arcBand(b,x,z,r0,r1,y0,y1,a0,a1,color,segments=20,minSegments=5){
  const n=Math.max(minSegments,Math.round(segments*(a1-a0)/Math.PI));
  const make=(r,y,a,norm)=>v([x+Math.cos(a)*r,y,z+Math.sin(a)*r],norm,color);
  for(let i=0;i<n;i++){
    const a=a0+(a1-a0)*i/n,c=a0+(a1-a0)*(i+1)/n;
    const d0=[Math.cos(a),0,Math.sin(a)],d1=[Math.cos(c),0,Math.sin(c)];
    b.quad(make(r1,y0,a,d0),make(r1,y0,c,d1),make(r1,y1,c,d1),make(r1,y1,a,d0));
    b.quad(make(r0,y1,a,mul(d0,-1)),make(r0,y1,c,mul(d1,-1)),make(r0,y0,c,mul(d1,-1)),make(r0,y0,a,mul(d0,-1)));
    b.quad(make(r0,y1,a,[0,1,0]),make(r1,y1,a,[0,1,0]),make(r1,y1,c,[0,1,0]),make(r0,y1,c,[0,1,0]));
    b.quad(make(r1,y0,a,[0,-1,0]),make(r0,y0,a,[0,-1,0]),make(r0,y0,c,[0,-1,0]),make(r1,y0,c,[0,-1,0]));
  }
  for(const [a,s] of [[a0,-1],[a1,1]]){
    const n=[-Math.sin(a)*s,0,Math.cos(a)*s];
    b.quad(make(r0,y0,a,n),make(r1,y0,a,n),make(r1,y1,a,n),make(r0,y1,a,n));
  }
}

function annulus(b,x,z,inner,outer,y,color,n=64){
  const up=[0,1,0];
  for(let i=0;i<n;i++){
    const a=TAU*i/n,c=TAU*(i+1)/n;
    const p=r=>[x+r*Math.cos(a),y,z+r*Math.sin(a)],q=r=>[x+r*Math.cos(c),y,z+r*Math.sin(c)];
    b.quad(v(p(inner),up,color),v(p(outer),up,color),v(q(outer),up,color),v(q(inner),up,color));
  }
}

function floor(b,w,d,r,detail){
  const hw=w*.5,hd=d*.5,n=Math.max(96,detail*4),radii=[r*.29,r*.36,r*.51,r*.63,r*.78,r*.91,r*1.13];
  const palette=[C.paleBlue,C.ivory,C.yellow,C.pink,C.ivory,C.paleBlue,C.ivory,C.cream];
  const q=(radius,a)=>[radius*Math.cos(a),0,radius*Math.sin(a)];
  for(let j=0;j<radii.length+1;j++){
    const inner=j? radii[j-1]:0,outer=j<radii.length?radii[j]:null,color=palette[j];
    for(let i=0;i<n;i++){
      const a=TAU*i/n,t=TAU*(i+1)/n;
      const hue=(j===2||j===4)&&i%16<8?mix(color,C.ivory,.18):color;
      const outerPos=angle=>outer===null?q(Math.min(hw/(Math.abs(Math.cos(angle))+1e-12),hd/(Math.abs(Math.sin(angle))+1e-12)),angle):q(outer,angle);
      const a0=outerPos(a),a1=outerPos(t),b0=q(inner,a),b1=q(inner,t),up=[0,1,0];
      if(inner===0)b.tri(v([0,0,0],up,hue),v(a0,up,hue),v(a1,up,hue));
      else b.quad(v(b0,up,hue),v(a0,up,hue),v(a1,up,hue),v(b1,up,hue));
    }
  }
}

// Individually coloured, slightly inset ceramic tiles on top of the continuous
// structural floor. Outside the central medallion only. No transparent textures,
// UV dependencies, tiled decals, or additional materials / draw calls.
function tileFloor(b,w,d,centralR){
  const pitch=1.13,gap=.026,y=.035;
  const cols=Math.ceil(w/pitch),rows=Math.ceil(d/pitch),cellW=w/cols,cellD=d/rows;
  const palette=[C.tileLight,C.ivory,C.cream,C.tileCool,C.warm,C.tileLight];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=-w*.5+(i+.5)*cellW,z=-d*.5+(j+.5)*cellD;
    const nearX=Math.max(0,Math.abs(x)-cellW*.5),nearZ=Math.max(0,Math.abs(z)-cellD*.5);
    if(Math.hypot(nearX,nearZ)<centralR+.22)continue;
    const hash=((Math.imul(i+43,73856093)^Math.imul(j+29,19349663))>>>0);
    const color=palette[hash%palette.length],dx=cellW*.5-gap,dz=cellD*.5-gap,up=[0,1,0];
    b.quad(v([x-dx,y,z-dz],up,color),v([x+dx,y,z-dz],up,color),
      v([x+dx,y,z+dz],up,color),v([x-dx,y,z+dz],up,color));
  }
}

const GLYPHS={D:['11110','10001','10001','10001','10001','10001','11110'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
  E:['11111','10000','10000','11110','10000','10000','11111'],
  R:['11110','10001','10001','11110','10100','10010','10001'],
  L:['10000','10000','10000','10000','10000','10000','11111'],
  A:['01110','10001','10001','11111','10001','10001','10001'],
  B:['11110','10001','10001','11110','10001','10001','11110']};
function raisedLetters(b,word,z,unit=.095){
  const h=unit*.39,y=.07,spacing=unit*6,width=word.length*spacing-unit;
  for(let k=0;k<word.length;k++){
    const bitmap=GLYPHS[word[k]];if(!bitmap)continue;
    for(let j=0;j<7;j++)for(let i=0;i<5;i++)if(bitmap[j][i]==='1'){
      const x=k*spacing+i*unit-width*.5,zp=z+(j-3)*unit;
      const up=[0,1,0],c=C.ivory;
      b.quad(v([x-h,y,zp-h],up,c),v([x+h,y,zp-h],up,c),v([x+h,y,zp+h],up,c),v([x-h,y,zp+h],up,c));
    }
  }
}

function planter(b,x,z,s,seed){
  const seg=12,cs=C.white,base=.47*s;
  lathe(b,x,z,[[base*.79,.07*s,cs],[base,.18*s,cs],[base*.94,.52*s,cs],[base*1.09,.62*s,cs]],seg);
  lathe(b,x,z,[[base*.86,.61*s,C.soil],[base*.86,.65*s,C.soil]],seg);
  let h=(Math.imul(seed|0,1664525)+1013904223)|0;
  for(let i=0;i<13;i++){
    h=(Math.imul(h,1664525)+1013904223)|0;
    const a=TAU*i/13+(h>>>28)*.025,d=(.16+(i%4)*.08)*s;
    const center=[x+Math.cos(a)*d,(.84+((i*3)%5)*.092)*s,z+Math.sin(a)*d];
    ellipsoid(b,center,[.21*s,.41*s,.225*s],[C.leaf,C.leafLight,C.leafDark][i%3],8,5,a);
  }
}

function trough(b,x,z,w,d,seed){
  roundedBox(b,[x,.37,z],[w,.74,d],.19,C.ivory,4);
  roundedBox(b,[x,.71,z],[w-.22,.105,d-.21],.045,C.soil,3);
  const alongX=w>d,count=Math.max(2,Math.round((alongX?w:d)/.72));
  for(let i=0;i<count;i++){
    const p=(i+.5)/count-.5,s=.50+((i*13+seed)%4)*.08;
    const px=x+(alongX?p*(w-.55):0),pz=z+(alongX?0:p*(d-.55));
    for(let j=0;j<5;j++){
      const a=TAU*j/5+(i%3)*.7;
      ellipsoid(b,[px+Math.cos(a)*s*.21,.93+((j+i)%3)*.13,pz+Math.sin(a)*s*.21],
        [s*.21,s*.46,s*.27],[C.leafDark,C.leaf,C.leafLight][(i+j)%3],8,5,a);
    }
  }
}

function fountain(b,x,z,s){
  lathe(b,x,z,[[1.23*s,.02,C.white],[1.34*s,.13,C.paleBlue],[1.34*s,.30,C.white],
    [1.12*s,.36,C.white],[1.01*s,.34,C.water],[.87*s,.31,C.water]],28);
  lathe(b,x,z,[[.35*s,.35,C.blue],[.35*s,.63,C.paleBlue],[.62*s,.71,C.ivory]],20);
  planter(b,x,z,.65*s,3475);
}

function column(b,x,z,height=4.7){
  const r=.82;
  lathe(b,x,z,[[.99,.02,C.coral],[1.02,.21,C.pink],[.88,.44,C.ivory],[.76,1.65,C.ivory],
    [.88,1.84,C.gold],[.88,2.03,C.yellow],[.74,3.2,C.ivory],[.81,3.45,C.cyan],
    [.81,height-.35,C.ivory],[1.05,height-.2,C.pink],[1.07,height,C.coral]],24);
  lathe(b,x,z,[[1.09,height-.02,C.ivory],[1.12,height+.06,C.ivory]],24);
}

function stairs(b,w,depth,baseZ,steps,rise){
  for(let i=0;i<steps;i++){
    const segmentDepth=depth/steps,front=baseZ+i*segmentDepth;
    roundedBox(b,[0,(i+1)*rise*.5,front+segmentDepth*.5],[w,(i+1)*rise,segmentDepth+.025],.045,i%2?C.paleBlue:C.ivory,3);
    roundedBox(b,[0,(i+1)*rise+.025,front+segmentDepth*.5],[w-.10,.055,segmentDepth-.09],.025,i%2?C.ivory:C.paleBlue,3);
  }
  roundedBox(b,[0,steps*rise*.5,baseZ+depth+1.06],[w+5.5,steps*rise,2.25],.14,C.ivory,4);
  roundedBox(b,[0,steps*rise+.045,baseZ+depth+1.06],[w+5.4,.09,2.23],.08,C.tileLight,3);
  for(const s of [-1,1]){
    roundedBox(b,[s*(w*.5+.31),steps*rise*.52,baseZ+depth*.5],[.68,steps*rise+.50,depth+1.2],.18,C.ivory,4);
    roundedBox(b,[s*(w*.5+.31),steps*rise+.36,baseZ+depth*.5],[.73,.19,depth+1.2],.09,C.pink,3);
    roundedBox(b,[s*(w*.5+1.38),steps*rise+.48,baseZ+depth+1.25],[2.5,.82,1.35],.25,C.warm,5);
  }
}

function makeRandom(seed){let n=seed|0;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};}

export function buildWorld(input={}){
  const config={...DEFAULT_RECIPE,...input};
  for(const k of ['width','depth','plazaRadius','portalWidth','archThickness','benchRadius','facets']){
    if(!Number.isFinite(config[k]))throw new Error('Bad recipe: '+k);
  }
  config.width=clamp(config.width,26,42);config.depth=clamp(config.depth,20,34);
  config.facets=Math.round(clamp(config.facets,12,40));config.plazaRadius=clamp(config.plazaRadius,4.2,7);
  config.benchRadius=clamp(config.benchRadius,2,3.2);config.portalWidth=clamp(config.portalWidth,3.8,5.1);
  config.archThickness=clamp(config.archThickness,.35,.75);config.seed=config.seed|0;
  const b=new MeshBucket('static'),glow=new MeshBucket('emissive');const random=makeRandom(config.seed);
  const xScale=config.width/32,zScale=config.depth/24,scale=Math.min(xScale,zScale);
  const xp=x=>x*xScale,zp=z=>z*zScale;
  b.part('radial lobby floor and individual ceramic tiles',()=>{
    floor(b,config.width,config.depth,config.plazaRadius*scale,config.facets);
    tileFloor(b,config.width,config.depth,config.plazaRadius*scale*1.13);
    raisedLetters(b,'DUDER',-.35*scale,.105*scale);
    raisedLetters(b,'LAB',.40*scale,.128*scale);
  });
  b.part('structural perimeter, pilasters, glazing panels and wall crowns',()=>{
    const x=config.width*.5,z=config.depth*.5;
    for(const side of [-1,1]){
      const wallX=side*(x-.32),portalZ=zp(4.7),gap=config.portalWidth*scale*.73;
      for(const [lo,hi] of [[-z+.6,portalZ-gap],[portalZ+gap,z-.6]]){
        const length=hi-lo,mid=(lo+hi)*.5;
        roundedBox(b,[wallX,.96,mid],[.85,1.92,length],.18,C.ivory,4);
        roundedBox(b,[wallX,1.42,mid],[.94,.24,length-.13],.09,C.blue,3);
        roundedBox(b,[wallX,1.58,mid],[.96,.11,length-.15],.04,C.white,3);
        roundedBox(b,[wallX,2.03,mid],[.98,.24,length+.06],.1,C.coral,3);
        roundedBox(b,[side*(x-.20),2.18,mid],[1.0,.17,length+.13],.07,C.ivory,3);
        // Vertical glazed rail sections repeat along the exterior, grounded
        // by substantial columns instead of floating decorative panel strips.
        const sections=Math.max(1,Math.round(length/2.5));
        for(let j=0;j<sections;j++){
          const p=lo+(j+.5)*length/sections;
          roundedBox(b,[side*(x-.25),1.10,p],[.065,.64,length/sections-.48],.03,C.paleBlue,2);
        }
      }
      roundedBox(b,[side*(x-.31),.17,0],[1.13,.34,config.depth-1.0],.11,C.blue,3);
      // High arch surround and solid shoulders, recessed behind the frames.
      roundedBox(b,[side*(x-.52),5.10,portalZ],[1.48,1.01,gap*2+1.0],.29,C.coral,5);
      roundedBox(b,[side*(x-.73),5.63,portalZ],[1.54,.28,gap*2+1.16],.12,C.ivory,4);
      for(const off of [-1,1]){
        roundedBox(b,[side*(x-.53),2.50,portalZ+off*(gap+.22)],
          [1.50,4.91,1.04],.31,C.ivory,5);
        roundedBox(b,[side*(x-.61),3.42,portalZ+off*(gap+.20)],
          [1.57,.40,1.13],.12,C.yellow,4);
        roundedBox(b,[side*(x-.61),.49,portalZ+off*(gap+.24)],
          [1.69,.32,1.35],.14,C.blue,3);
      }
    }
    for(const side of [-1,1]){
      roundedBox(b,[side*(x*.68),.89,z-.35],[x*.58,1.78,.78],.22,C.ivory,4);
      roundedBox(b,[side*(x*.68),1.81,z-.34],[x*.58,.19,.90],.08,C.pink,3);
      roundedBox(b,[side*(x*.68),.62,-z+.36],[x*.58,1.24,.76],.25,C.ivory,4);
      roundedBox(b,[side*(x*.68),1.29,-z+.33],[x*.58,.14,.91],.08,C.pink,3);
      roundedBox(b,[side*(x*.73),1.02,-z+.30],[x*.39,.35,.91],.13,C.blue,3);
    }
    // The front facade stays low so the room remains readable from outside.
    for(const side of [-1,1])for(const bx of [xp(7.7),xp(11.4)]){
      roundedBox(b,[side*bx,.78,-z+.36],[.24,1.45,.92],.10,C.white,3);
    }
    for(const side of [-1,1])for(const rz of [-8.5,-3.0,10.0]){
      const zz=zp(rz);
      roundedBox(b,[side*(x-.38),2.30,zz],[1.13,.55,1.0],.15,C.ivory,3);
      roundedBox(b,[side*(x-.34),2.66,zz],[1.08,.18,1.06],.07,C.gold,3);
    }
  });
  b.part('recessed, nested portal arches and stepped circular thresholds',()=>{
    for(const side of [-1,1]){
      const z=zp(4.7),width=config.portalWidth*scale;
      const ink=side<0?C.portalGold:C.portalViolet,frame=side<0?C.cyan:C.sea;
      portal(b,null,xp(side*15.03),z,-side,width+.85*scale,.73*scale,config.facets,C.coral);
      portal(b,null,xp(side*14.83),z,-side,width+.43*scale,.59*scale,config.facets,C.yellow);
      portal(b,glow,xp(side*14.55),z,-side,width,config.archThickness*scale,config.facets,frame,ink);
      portal(b,null,xp(side*14.26),z,-side,width-.53*scale,.19*scale,config.facets,C.ivory);
      portal(glow,null,xp(side*14.20),z,-side,width-.82*scale,.07*scale,config.facets,ink);
      const a=side>0?Math.PI/2: -Math.PI/2;
      for(let i=0;i<3;i++){
        const r=(2.36+i*.31)*scale,c=[C.blue,C.cyan,C.ivory][i];
        arcBand(b,xp(side*13.88),z,r,r+.30*scale,.037,.13-i*.020,
          a, a+Math.PI, c,config.facets);
      }
      for(let i=0;i<12;i++){
        const t=(i+.2)/12,a=-1.1+t*2.35;
        const qx=xp(side*14.05),qy=1.05+Math.sin(i*4.3)*.55,qz=z+Math.sin(a)*width*.4;
        ellipsoid(glow,[qx,qy,qz],[.055,.055,.055],i%3?C.white:ink,7,5);
      }
    }
  });
  b.part('raised mezzanine, colour-riser staircase, solid balustrades',()=>{
    stairs(b,7.2*xScale,3.3*zScale,zp(6.65),5,.235);
    for(const side of [-1,1]){
      const x=xp(side*8.3);
      roundedBox(b,[x,.57,zp(9.75)],[3.5*xScale,1.14,3.60*zScale],.26,C.warm,5);
      roundedBox(b,[x,1.18,zp(9.75)],[3.48*xScale,.13,3.60*zScale],.08,C.tileLight,3);
      roundedBox(b,[x,1.54,zp(8.25)],[3.8*xScale,.72,.48*zScale],.19,C.pink,4);
      roundedBox(b,[x,1.83,zp(8.25)],[3.8*xScale,.15,.52*zScale],.065,C.ivory,3);
      trough(b,x,zp(10.3),3.15*xScale,.89*zScale,config.seed+side*11);
    }
  });
  b.part('four-colour curved seating pods with proper backrests and inset tables',()=>{
    for(const side of [-1,1]){
      const x=xp(side*9.7),z=zp(-4.5),r=config.benchRadius*scale;
      for(let i=0;i<4;i++){
        const a=.06+i*TAU/4,offset=.13;
        arcBench(b,x,z,r,a+offset,a+TAU/4-offset,i%2?C.pink:C.yellow,config.facets);
        arcBand(b,x,z,r+.47*scale,r+.75*scale,.52,1.40,
          a+offset+.015,a+TAU/4-offset-.015,i%2?C.coral:C.gold,config.facets);
        arcBand(b,x,z,r+.46*scale,r+.79*scale,1.36,1.49,
          a+offset+.015,a+TAU/4-offset-.015,C.ivory,config.facets);
        arcBand(b,x,z,r-.37*scale,r+.28*scale,.92,.985,
          a+offset+.045,a+TAU/4-offset-.045,i%2?C.peach:C.yellow,config.facets);
      }
      lathe(b,x,z,[[.79,.05,C.cream],[.90,.32,C.ivory],[.79,.38,C.white]],20);
      planter(b,x,z,1.05*scale,config.seed+17*side);
    }
  });
  b.part('glowing front fountain, side lounge islands and low geometric bollards',()=>{
    fountain(b,0,zp(-9.3),.85*scale);
    annulus(glow,0,zp(-9.3),1.34*scale,1.47*scale,.045,C.water,48);
    annulus(b,0,zp(-9.3),1.49*scale,1.61*scale,.038,C.paleBlue,48);
    roundedBox(b,[xp(-4.2),.48,zp(-7.15)],[1.65,.96,.7],.22,C.pink,5);
    roundedBox(b,[xp(4.3),.48,zp(-7.15)],[1.65,.96,.7],.22,C.yellow,5);
    for(const side of [-1,1]){
      roundedBox(b,[xp(side*4.2),.50,zp(3.7)],[1.95,1,.78],.28,C.pink,5);
      roundedBox(b,[xp(side*7.5),.5,zp(7.35)],[2.15,1,.85],.28,C.yellow,5);
      roundedBox(b,[xp(side*5.9),.33,zp(-9.55)],[1.1,.64,1.10],.28,C.coral,4);
      roundedBox(b,[xp(side*4.7),.31,zp(-10.10)],[1.08,.60,1.15],.21,C.yellow,4);
    }
  });
  b.part('striped structural towers, balcony sconces and boundary planters',()=>{
    for(const side of [-1,1])for(const rz of [-10.7,10.7])column(b,xp(side*14.35),zp(rz),4.8);
    for(const side of [-1,1])for(const rz of [-7.3,0.4,9.3]){
      const x=xp(side*15.13),z=zp(rz);
      roundedBox(b,[x,2.18,z],[.18,.48,.73],.10,C.ivory,3);
      roundedBox(glow,[x-side*.16,2.18,z],[.13,.33,.51],.06,C.lamp,3);
    }
    const sites=[[-12.9,-7.0],[-13,1.0],[-11.8,8.8],[12.9,-7.0],[13,1.0],[11.8,8.8],
      [-11.2,-10.5],[11.2,-10.5],[-7.5,4.8],[7.5,4.8],[-6.6,-10.5],[6.6,-10.5],
      [-3.7,10.8],[3.7,10.8],[-10,2.6],[10,2.6]];
    for(let i=0;i<sites.length;i++){
      const [x,z]=sites[i],shift=(random()-.5)*.55;
      planter(b,xp(x+shift),zp(z+(random()-.5)*.55),(.78+random()*.27)*scale,config.seed+i*19);
    }
    for(const side of [-1,1]){
      trough(b,xp(side*14.15),zp(-4.45),.9*xScale,3.2*zScale,config.seed+side*22);
      trough(b,xp(side*8.55),zp(-10.8),3.0*xScale,.82*zScale,config.seed+side*27);
      trough(b,xp(side*14.05),zp(9.05),.85*xScale,2.25*zScale,config.seed+side*37);
    }
  });
  const result={config,opaque:b.output(),glow:glow.output()};
  result.stats={vertices:result.opaque.positions.length/3+result.glow.positions.length/3,
    triangles:(result.opaque.indices.length+result.glow.indices.length)/3,
    staticDraws:2};
  return result;
}

export {C as PALETTE};
// Shared procedural modelling primitives used by the larger archipelago scene.
// Keeping a single implementation preserves the V0.2 bevel/weld/normal fixes.
export {MeshBucket, roundedBox, lathe, ellipsoid, arcBand, annulus, planter, trough, fountain, portal, makeRandom};
