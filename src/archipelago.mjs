// DuderWorld V0.3 — connected, fully modeled islands for Tront-EOS.
// Pure mesh generator: baked geometry (including bridges, bowls, cliff walls,
// static toys and signage) has no dependency on avatars, browser or physics.
// Units are meters. Y=0 is island walking surface, ocean ~= -3.6.
import {Vector2,ShapeUtils} from 'three';
import {generateLayoutGraph} from './layout-graph.mjs';
import {MeshBucket,roundedBox,lathe,ellipsoid,arcBand,annulus,planter,
  trough,fountain,makeRandom} from './world.mjs';

export const DEFAULT_ARCHIPELAGO=Object.freeze({
  spread:1, detail:32, greenery:1, seed:20261024, oceanSize:360,
  islandCount:7, topology:'radial', variation:0
});
export const PALETTE={
  white:[255,246,226],cream:[244,227,199],ivory:[255,242,218],
  tile:[245,239,222],pale:[237,228,216],stone:[209,196,181],
  warm:[248,207,173],sand:[222,181,144],rock:[152,145,148],
  rockDeep:[102,126,143],rockLight:[193,180,163],
  coral:[255,122,111],rose:[246,154,155],pink:[246,154,155],peach:[255,183,156],
  yellow:[255,215,110],gold:[243,177,75],
  aqua:[73,212,214],cyan:[110,208,235],paleBlue:[188,219,239],sea:[40,181,197],
  blue:[110,164,232],blueDark:[55,111,178],deep:[43,103,143],
  lilac:[199,157,234],violet:[160,117,226],mint:[170,231,189],
  leaf:[86,186,96],leafDark:[37,140,104],leafLight:[137,211,110],
  teal:[37,148,150],ink:[57,85,112],water:[35,168,204],
  foam:[189,241,226],glow:[255,241,171],black:[34,55,79],
};
const P=PALETTE,TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const norm=p=>{let n=Math.hypot(...p)||1;return p.map(x=>x/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const plus=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,k)=>a.map(x=>x*k);
const vertex=(p,n,c)=>({p,n,c});

// A regular rounded box rotated around global Y, used for bridge segments,
// angled benches, rails, minigame consoles and low-poly modular scenery.
function orientedBox(b,position,size,r,color,yaw=0,detail=3){
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  const cv=x=>({...x,p:[position[0]+x.p[0]*cs+x.p[2]*sn,
    position[1]+x.p[1],position[2]-x.p[0]*sn+x.p[2]*cs],
    n:[x.n[0]*cs+x.n[2]*sn,x.n[1],-x.n[0]*sn+x.n[2]*cs]});
  const target={
    tri(a,c,d){b.tri(cv(a),cv(c),cv(d));},
    quad(a,c,d,e){b.quad(cv(a),cv(c),cv(d),cv(e));}
  };
  roundedBox(target,[0,0,0],size,r,color,detail);
}
function tube(b,a,z,radius,color,segments=9){
  const u=norm(sub(z,a));const side=norm(cross(Math.abs(u[1])>.88?[1,0,0]:[0,1,0],u));
  const front=norm(cross(u,side));const rings=[];
  for(const pt of [a,z]){
    const row=[];
    for(let i=0;i<segments;i++){
      const th=TAU*i/segments,nn=plus(mul(side,Math.cos(th)),mul(front,Math.sin(th)));
      row.push(vertex(plus(pt,mul(nn,radius)),nn,color));
    }
    rings.push(row);
  }
  for(let i=0;i<segments;i++){
    const j=(i+1)%segments;
    b.quad(rings[0][i],rings[0][j],rings[1][j],rings[1][i]);
  }
  for(const [ring,sign,at] of [[rings[0],-1,a],[rings[1],1,z]]){
    const n=mul(u,sign),c=vertex(at,n,color);
    for(let i=0;i<segments;i++){
      const j=(i+1)%segments;
      b.tri(c,vertex(ring[i].p,n,color),vertex(ring[j].p,n,color));
    }
  }
}
function disk(b,x,z,r,y,color,facets=32){
  const v=vertex([x,y,z],[0,1,0],color);
  for(let i=0;i<facets;i++){
    const a=TAU*i/facets,n=TAU*(i+1)/facets;
    b.tri(v,vertex([x+r*Math.cos(a),y,z+r*Math.sin(a)],[0,1,0],color),
      vertex([x+r*Math.cos(n),y,z+r*Math.sin(n)],[0,1,0],color));
  }
}
function strip(b,a,c,width,y,color){
  const d=norm([c[0]-a[0],0,c[1]-a[1]]),s=[-d[2]*width*.5,0,d[0]*width*.5];
  const p=[a[0],y,a[1]],q=[c[0],y,c[1]],n=[0,1,0];
  b.quad(vertex(plus(p,s),n,color),vertex(plus(q,s),n,color),
    vertex(sub(q,s),n,color),vertex(sub(p,s),n,color));
}
const SITES=[
  {id:'skate',name:'SKATE PARK',x:0,z:0,r:23.5,theme:'main',palette:P.aqua},
  {id:'friends',name:'FRIENDS',x:-43,z:-26,r:14.2,theme:'friends',palette:P.gold},
  {id:'voice',name:'VOICE',x:0,z:-46,r:14.2,theme:'voice',palette:P.violet},
  {id:'sessions',name:'SESSIONS',x:43,z:-26,r:14.2,theme:'sessions',palette:P.cyan},
  {id:'physics',name:'PHYSICS',x:-43,z:28,r:14.7,theme:'physics',palette:P.coral},
  {id:'arcade',name:'ARCADE',x:0,z:48,r:14.7,theme:'arcade',palette:P.violet},
  {id:'network',name:'NET LAB',x:43,z:28,r:14.2,theme:'network',palette:P.blue},
];
const fixedCenters=SITES.map(s=>[s.x,s.z]);
const colorFor=(i)=>[P.tile,P.ivory,P.cream,P.pale,P.white,P.warm][i%6];
const bridgeAngle=(site)=>Math.atan2(-site.z,-site.x);
function islandR(site,a,seed){
  return site.r*(1+.033*Math.sin(a*3+seed*.01)+.023*Math.sin(a*5+site.x*.5)
    +.014*Math.sin(a*9+site.z*.4));
}
function isInside(site,x,z,margin=0){
  const dx=x-site.x,dz=z-site.z,a=Math.atan2(dz,dx);
  return Math.hypot(dx,dz)<islandR(site,a,site.seed)-margin;
}
function maskBowls(site,x,z,margin=0){
  if(site.id!=='skate')return false;
  return BOWLS.some(b=>Math.hypot((x-b.x)/(b.rx*b.outer+margin),
    (z-b.z)/(b.rz*b.outer+margin))<1);
}
// Top contours use actual holes for bowl openings: no invisible collision
// slabs cutting across the bowl floor. ShapeUtils uses Earcut internally.
function islandTop(b,site,detail){
  const n=detail*3,outline=[];
  for(let i=n-1;i>=0;i--){
    const a=TAU*i/n,r=islandR(site,a,site.seed);
    outline.push(new Vector2(site.x+r*Math.cos(a),site.z+r*Math.sin(a)));
  }
  const holes=[];
  if(site.id==='skate')for(const bowl of BOWLS){
    const ring=[];
    for(let i=0;i<64;i++){
      const a=TAU*i/64;
      ring.push(new Vector2(bowl.x+bowl.rx*bowl.outer*Math.cos(a),
        bowl.z+bowl.rz*bowl.outer*Math.sin(a)));
    }
    holes.push(ring);
  }
  const flat=outline.concat(...holes),faces=ShapeUtils.triangulateShape(outline,holes);
  for(const [i,j,k] of faces){
    const col=site.id==='skate'?P.cream:P.ivory,n=[0,1,0];
    b.tri(vertex([flat[i].x,0,flat[i].y],n,col),
      vertex([flat[j].x,0,flat[j].y],n,col),
      vertex([flat[k].x,0,flat[k].y],n,col));
  }
}
function cliff(b,glow,site,detail){
  const count=detail*3;
  const levels=[
    {r:1.0,y:-.02,c:P.ivory}, {r:1.053,y:-.23,c:P.warm},
    {r:1.074,y:-.55,c:P.sand}, {r:1.042,y:-1.12,c:P.rockLight},
    {r:.962,y:-2.06,c:P.rock}, {r:.837,y:-3.02,c:P.rockDeep},
    {r:.70,y:-3.83,c:P.rockDeep},
  ];
  const ring=[];
  for(let j=0;j<levels.length;j++){
    const row=[],l=levels[j];
    for(let i=0;i<count;i++){
      const a=TAU*i/count;
      const r=islandR(site,a,site.seed)*l.r*
        (j<2?1:1+.045*Math.sin(a*17+j*1.4+site.seed*.03));
      const p=[site.x+r*Math.cos(a),l.y,site.z+r*Math.sin(a)];
      const next=levels[Math.max(0,j-1)],prev=levels[Math.min(levels.length-1,j+1)];
      const rr=(next.r-prev.r)*site.r,dy=next.y-prev.y;
      const n=norm([Math.cos(a)*Math.abs(dy),rr,Math.sin(a)*Math.abs(dy)]);
      row.push(vertex(p,n,l.c));
    }
    ring.push(row);
  }
  for(let j=0;j<ring.length-1;j++)for(let i=0;i<count;i++){
    const next=(i+1)%count,band=j===3||j===4;
    if(band){
      const tint=((i*13+j*7)%9)<3?P.rock:P.rockLight;
      const cv=o=>vertex(o.p,o.n,mix(o.c,tint,.17));
      b.quad(cv(ring[j][i]),cv(ring[j][next]),cv(ring[j+1][next]),cv(ring[j+1][i]));
    }else b.quad(ring[j][i],ring[j][next],ring[j+1][next],ring[j+1][i]);
  }
  // A slender ivory coping band and cyan sea foam follow the actual cliff,
  // not a mathematically perfect circle intersecting an irregular shoreline.
  for(let i=0;i<count;i++){
    const a=TAU*i/count,c=TAU*(i+1)/count;
    const p=(angle,rr,y)=>{const r=islandR(site,angle,site.seed)*rr;
      return [site.x+r*Math.cos(angle),y,site.z+r*Math.sin(angle)];};
    const n=[0,1,0];
    b.quad(vertex(p(a,.972,.052),n,P.white),vertex(p(c,.972,.052),n,P.white),
      vertex(p(c,1.013,.052),n,P.white),vertex(p(a,1.013,.052),n,P.white));
    const foamColor=i%9<4?P.foam:P.aqua,fi=vertex(p(a,1.075,-3.58),n,foamColor);
    glow.quad(fi,vertex(p(c,1.075,-3.58),n,foamColor),
      vertex(p(c,1.145,-3.61),n,foamColor),
      vertex(p(a,1.145,-3.61),n,foamColor));
  }
}
// Wrapped perimeter walls have gaps oriented toward the central island.
// Railings are structural: full-height plinths, caps and short illuminated posts.
function rim(b,glow,site,detail,random,sites,graph){
  const n=site.id==='skate'?88:48;
  const gap=site.id==='skate'?.15:.25;
  // Open retaining walls at actual edges, including ring and chain bridges.
  const entrances=graph.edges
    .filter(e=>e.from===site.id||e.to===site.id)
    .map(e=>{
      const other=sites.find(s=>s.id===(e.from===site.id?e.to:e.from));
      return Math.atan2(other.z-site.z,other.x-site.x);
    });
  for(let i=0;i<n;i++){
    const a=TAU*i/n,next=TAU*(i+1)/n;
    const omit=entrances.some(angle=>
      Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)))<gap);
    const radius=site.r*.876;
    if(!omit){
      arcBand(b,site.x,site.z,radius,radius+.33,.04,.70,a,next,P.white,7);
      arcBand(b,site.x,site.z,radius+.28,radius+.42,.68,.84,a,next,
        i%7<3?site.palette:P.rose,7);
    }
    if(i%4===0&&!omit){
      const x=site.x+Math.cos(a)*radius,z=site.z+Math.sin(a)*radius;
      const height=site.id==='skate'?2.12:2.57;
      lathe(b,x,z,[[.51,.04,P.ivory],[.67,.45,P.white],[.51,1.21,P.cream],
        [.51,height-.30,P.ivory],[.66,height-.18,P.coral],
        [.67,height,P.white]],14);
      lathe(glow,x,z,[[.37,height+.04,P.glow],
        [.30,height+.24,P.yellow],[.20,height+.31,P.glow]],12);
    }
  }
  // Interior greenery placed around the wall, excluding bridge approaches.
  const count=Math.round((site.id==='skate'?20:12)*site.greenery);
  for(let i=0;i<count;i++){
    const a=TAU*(i+.36)/count;
    if(entrances.some(angle=>
      Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)))<.31))continue;
    const d=site.r*(.77+random()*.04),x=site.x+Math.cos(a)*d,z=site.z+Math.sin(a)*d;
    planter(b,x,z,.71+random()*.25,site.seed+i*19);
  }
}
function activityBackdrop(b,glow,site){
  if(site.id==='skate')return;
  const {x,z,r}=site,away=Math.atan2(z,x);
  const a0=away-1.11,a1=away+1.11,parts=14;
  for(let i=0;i<parts;i++){
    const lo=a0+(a1-a0)*i/parts,hi=a0+(a1-a0)*(i+1)/parts;
    // Stacked real-height walls with a recessed, contrasting colored band.
    // Unlike flat decals, the curvature is legible from a walking camera.
    arcBand(b,x,z,r*.719,r*.789,.0,2.8,lo,hi,P.white,12);
    arcBand(b,x,z,r*.717,r*.730,1.20,2.48,lo+.008,hi-.008,
      i%3===0?site.palette:P.paleBlue,9);
    arcBand(b,x,z,r*.710,r*.796,2.78,3.15,lo,hi,i%2?P.coral:P.rose,8);
    arcBand(b,x,z,r*.710,r*.795,3.10,3.30,lo,hi,P.ivory,8);
    if(i%3===1){
      const a=(lo+hi)*.5;
      const px=x+Math.cos(a)*r*.726,pz=z+Math.sin(a)*r*.726;
      arcBand(glow,x,z,r*.707,r*.713,1.48,2.25,
        lo+.025,hi-.025,[P.gold,P.cyan,P.lilac][i%3],8);
      ellipsoid(glow,[px,3.32,pz],[.22,.25,.22],P.yellow,8,5);
    }
  }
  for(let i=0;i<=7;i++){
    const a=a0+(a1-a0)*i/7;
    const px=x+Math.cos(a)*r*.755,pz=z+Math.sin(a)*r*.755;
    lathe(b,px,pz,[[.60,.08,P.white],[.73,.35,P.cream],[.56,2.72,P.ivory],
      [.74,3.07,site.palette],[.68,3.62,P.white],
      [.85,3.76,P.coral]],14);
    lathe(glow,px,pz,[[.44,3.8,P.gold],[.43,4.02,P.glow]],12);
  }
  // Raised gardens against the curved wall help define a usable social room.
  for(let i=0;i<5;i++){
    const a=a0+.24+(a1-a0-.48)*i/4;
    const px=x+Math.cos(a)*r*.642,pz=z+Math.sin(a)*r*.642;
    planter(b,px,pz,.92,site.seed+i*41);
  }
}
function pavers(b,site){
  const pitch=1.62,inner=site.r*.855,rows=Math.ceil(inner*2/pitch);
  for(let j=0;j<rows;j++)for(let i=0;i<rows;i++){
    const x=site.x-inner+(i+.5)*pitch,z=site.z-inner+(j+.5)*pitch;
    if(!isInside(site,x,z,site.r*.17+pitch*.66)||maskBowls(site,x,z,.75))continue;
    const seed=(Math.imul(i+101,73856093)^Math.imul(j+37,19349663))>>>0;
    const color=colorFor(seed%6),h=.024,w=.745,normal=[0,1,0];
    const a=[x-w,h,z-w],q=[x+w,h,z-w],c=[x+w,h,z+w],d=[x-w,h,z+w];
    b.quad(vertex(a,normal,color),vertex(q,normal,color),
      vertex(c,normal,color),vertex(d,normal,color));
  }
}

const BOWLS=[
  {x:7.1,z:-3.5,rx:8.6,rz:7.9,depth:2.18,outer:1.13},
  {x:-11.2,z:-8.4,rx:4.3,rz:4.05,depth:1.43,outer:1.13},
];
function bowlMesh(b,glow,bowl,detail){
  const levels=[
    [0,-bowl.depth+.035,P.cyan],[.22,-bowl.depth+.035,P.cyan],
    [.43,-bowl.depth+.010,P.blue],[.62,-bowl.depth*.94,P.blue],
    [.73,-bowl.depth*.86,P.aqua],[.83,-bowl.depth*.64,P.aqua],
    [.94,-bowl.depth*.25,P.pale],[1.008,.05,P.ivory],
    [1.047,.20,P.coral],[1.075,.25,P.gold],
    [1.13,.045,P.ivory],
  ];
  const rings=[],n=detail*3;
  for(let j=0;j<levels.length;j++){
    const [r,y,color]=levels[j],row=[];
    const before=levels[Math.max(j-1,0)],after=levels[Math.min(j+1,levels.length-1)];
    const slope=(after[1]-before[1])/(after[0]-before[0]||1)*.3;
    for(let i=0;i<n;i++){
      const a=TAU*i/n,ca=Math.cos(a),sa=Math.sin(a),xx=bowl.x+ca*bowl.rx*r,zz=bowl.z+sa*bowl.rz*r;
      const nn=norm([-ca*slope/bowl.rx,1,-sa*slope/bowl.rz]);
      row.push(vertex([xx,y,zz],nn,color));
    }
    rings.push(row);
  }
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<n;i++){
    const next=(i+1)%n;
    b.quad(rings[j][i],rings[j][next],rings[j+1][next],rings[j+1][i]);
  }
  disk(b,bowl.x,bowl.z,.22*Math.min(bowl.rx,bowl.rz),-bowl.depth+.038,P.blue,n);
  // Metallic smooth coping with a short coral/yellow perimeter ring.
  for(let i=0;i<n;i++){
    const a=TAU*i/n,t=TAU*(i+1)/n;
    tube(b,[bowl.x+bowl.rx*1.061*Math.cos(a),.255,bowl.z+bowl.rz*1.061*Math.sin(a)],
      [bowl.x+bowl.rx*1.061*Math.cos(t),.255,bowl.z+bowl.rz*1.061*Math.sin(t)],
      .072,i%11<6?P.white:P.yellow,6);
  }
  // Simple inlaid rings visibly show the curvature as you approach the bowl.
  for(const [radius,color] of [[.55,P.pale],[.70,P.blueDark]]){
    const depthAt=radius<.65?-bowl.depth*.99:-bowl.depth*.90;
    const nSegments=detail*4;
    for(let i=0;i<nSegments;i++){
      const a=TAU*i/nSegments,t=TAU*(i+1)/nSegments;
      strip(glow,[bowl.x+bowl.rx*radius*Math.cos(a),bowl.z+bowl.rz*radius*Math.sin(a)],
        [bowl.x+bowl.rx*radius*Math.cos(t),bowl.z+bowl.rz*radius*Math.sin(t)],
        .095,depthAt+.045,color);
    }
  }
}
function curvedRamp(b,x,z,w,d,depth,orientation=0){
  // Solid, walkable half-pipe trough. The deck climbs continuously from its
  // flat center to both coping lips; no disconnected wedge/prism impostors.
  const steps=26,along=9,rows=[];
  const cs=Math.cos(orientation),sn=Math.sin(orientation);
  const point=(xx,y,zz)=>[x+xx*cs+zz*sn,y,z-xx*sn+zz*cs];
  for(let i=0;i<=steps;i++){
    const u=i/steps*2-1,yy=.13+depth*Math.pow(Math.abs(u),2.45),row=[];
    const derivative=depth*2.45*Math.sign(u)*Math.pow(Math.abs(u),1.45)/(w*.5);
    for(let j=0;j<=along;j++){
      const v=j/along*2-1,col=Math.abs(u)>.87?P.coral:Math.abs(u)>.55?P.gold:P.pale;
      const normal=norm([(-derivative)*cs,1,derivative*sn]);
      row.push(vertex(point(u*w*.5,yy,v*d*.5),normal,col));
    }
    rows.push(row);
  }
  for(let i=0;i<steps;i++)for(let j=0;j<along;j++){
    b.quad(rows[i][j],rows[i+1][j],rows[i+1][j+1],rows[i][j+1]);
  }
  for(const dir of [-1,1]){
    const px=dir*w*.5;
    tube(b,point(px,depth+.23,-d*.5),point(px,depth+.23,d*.5),.105,P.white,9);
    orientedBox(b,point(px,depth*.5,0),[.52,depth,d+.16],.17,P.white,orientation,3);
  }
  for(const dir of [-1,1]){
    const base=point(0,.20,dir*d*.5);
    orientedBox(b,base,[w*.95,.32,.30],.08,P.gold,orientation,3);
  }
}
function launchRamp(b,x,z,w,l,height,yaw,color){
  const m=12,cs=Math.cos(yaw),sn=Math.sin(yaw),point=(a,y,q)=>
    [x+a*cs+q*sn,y,z-a*sn+q*cs];
  for(let i=0;i<m;i++){
    const lo=i/m,hi=(i+1)/m;
    const smooth=t=>Math.pow(t,1.55);
    const p=(t,q)=>vertex(point((t-.5)*l,.035+height*smooth(t),q*w*.5),
      norm([-height*1.55*Math.pow(Math.max(.01,t),.55)*cs/l,1,
        height*1.55*Math.pow(Math.max(.01,t),.55)*sn/l]),color);
    b.quad(p(lo,-1),p(hi,-1),p(hi,1),p(lo,1));
  }
  const top=point(l*.5,height*.5,0);
  orientedBox(b,top,[.4,height,w],.10,P.ivory,yaw,3);
}
function billboard(b,x,z,label,color,yaw=0){
  orientedBox(b,[x,.18,z],[Math.max(label.length*.81+2,7.8),.32,2.12],.22,color,yaw,4);
  orientedBox(b,[x,.35,z],[Math.max(label.length*.81+1.5,7.3),.09,1.70],.04,P.ink,yaw,2);
  floorText(b,label,[x,.403,z],.145,.405,P.white,yaw);
}
// Seven-row pixel glyphs: real triangular geometry, valid in GLB. All signs
// read as 3D material-colored objects when the world is viewed from above.
const GLYPHS={
  A:['01110','10001','10001','11111','10001','10001','10001'],
  B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'],
  D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'],
  F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01110'],
  H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'],
  J:['00111','00010','00010','00010','10010','10010','01100'],
  K:['10001','10010','10100','11000','10100','10010','10001'],
  L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'],
  N:['10001','11001','10101','10011','10001','10001','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'],
  P:['11110','10001','10001','11110','10000','10000','10000'],
  Q:['01110','10001','10001','10001','10101','10010','01101'],
  R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'],
  T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
  V:['10001','10001','10001','10001','10001','01010','00100'],
  W:['10001','10001','10001','10101','10101','10101','01010'],
  X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'],
  Z:['11111','00001','00010','00100','01000','10000','11111'],
  0:['01110','10011','10101','10101','11001','10001','01110'],
  1:['00100','01100','00100','00100','00100','00100','01110'],
  2:['01110','10001','00001','00010','00100','01000','11111'],
  3:['11110','00001','00001','01110','00001','00001','11110'],
  '-':['00000','00000','00000','11111','00000','00000','00000'],
  ' ':['00000','00000','00000','00000','00000','00000','00000']
};
function floorText(b,word,center,u=.16,y=.07,col=P.white,yaw=0){
  const length=word.length*6*u,cs=Math.cos(yaw),sn=Math.sin(yaw);
  for(let k=0;k<word.length;k++){
    const rows=GLYPHS[word[k]]||GLYPHS[' '];
    for(let j=0;j<7;j++)for(let i=0;i<5;i++)if(rows[j][i]==='1'){
      const a=k*6*u+i*u-length*.5,z=(j-3)*u;
      const x=center[0]+a*cs+z*sn,pz=center[2]-a*sn+z*cs;
      const half=u*.40,n=[0,1,0];
      const corner=(da,dz)=>vertex([x+da*cs+dz*sn,y,pz-da*sn+dz*cs],n,col);
      b.quad(corner(-half,-half),corner(half,-half),
        corner(half,half),corner(-half,half));
    }
  }
}
function archGate(b,glow,x,z,width,height,yaw,color,shine){
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  const point=(a,y,d=0)=>[x+a*cs+d*sn,y,z-a*sn+d*cs];
  const n=24,points=[[-width*.5,.2],[-width*.5,height-width*.5]];
  for(let i=0;i<=n;i++){
    const a=Math.PI-i*Math.PI/n;
    points.push([width*.5*Math.cos(a),height-width*.5+width*.5*Math.sin(a)]);
  }
  points.push([width*.5,.2]);
  for(const [r,c] of [[.41,color],[.20,P.gold]]){
    for(let j=0;j<points.length-1;j++){
      tube(b,point(...points[j]),point(...points[j+1]),r,c,10);
    }
  }
  // A true doorway (no opaque planar blockage) with a bright threshold rim.
  const xA=point(-width*.5,.075,-.1),xB=point(width*.5,.075,-.1);
  tube(glow,xA,xB,.10,shine,8);
  disk(glow,x,z,width*.31,.09,shine,22);
}
function palm(b,x,z,height,angle=0){
  let last=[x,.0,z],pos=last;
  for(let j=1;j<=5;j++){
    const t=j/5;
    pos=[x+Math.cos(angle)*.75*t*t,height*t,z+Math.sin(angle)*.75*t*t];
    tube(b,last,pos,.21*(1-.56*t),j%2?P.sand:P.rockLight,8);
    last=pos;
  }
  for(let j=0;j<8;j++){
    const a=angle+TAU*j/8,r=2.20+(j%3)*.22;
    const mid=[pos[0]+Math.cos(a)*r*.42,pos[1]+.42,pos[2]+Math.sin(a)*r*.42];
    const end=[pos[0]+Math.cos(a)*r,pos[1]-.78,pos[2]+Math.sin(a)*r];
    const dir=[-Math.sin(a),0,Math.cos(a)],w=.42;
    const start=vertex(pos,[0,1,0],j%3?P.leafLight:P.leaf);
    for(const [one,two,c] of [[pos,mid,P.leafLight],[mid,end,P.leaf]]){
      const pa=vertex(plus(one,mul(dir,w)),[0,1,0],c),pb=vertex(plus(one,mul(dir,-w)),[0,1,0],c);
      const pc=vertex(plus(two,mul(dir,-w*.58)),[0,1,0],c),pd=vertex(plus(two,mul(dir,w*.58)),[0,1,0],c);
      b.quad(pa,pb,pc,pd);
      const nn=[0,-1,0];
      b.quad(vertex(pa.p,nn,c),vertex(pd.p,nn,c),vertex(pc.p,nn,c),vertex(pb.p,nn,c));
    }
  }
}
function shoreline(b,site,random){
  // All decorative rocks sit at the foot of the cliff, leaving the walking
  // surface open. Palms lean away from spawn and bridge approaches.
  for(let i=0;i<21;i++){
    const a=TAU*i/21+(random()-.5)*.18,d=site.r*(1.07+random()*.2);
    ellipsoid(b,[site.x+Math.cos(a)*d,-3.18,site.z+Math.sin(a)*d],
      [.70+random()*.55,.57+random()*.65,.61+random()*.5],
      [P.rock,P.rockLight,P.rockDeep][i%3],8,5,a);
  }
  const count=Math.round((site.id==='skate'?8:4)*site.greenery);
  for(let i=0;i<count;i++){
    const a=TAU*(i+.43)/count;
    const bridge=inletAngle(site);
    if(bridge!==null&&Math.abs(Math.atan2(Math.sin(a-bridge),Math.cos(a-bridge)))<.22)continue;
    const d=site.r*.95;
    palm(b,site.x+d*Math.cos(a),site.z+d*Math.sin(a),3+random()*1.2,a+.3);
  }
}
function inletAngle(site){return site.id==='skate'?null:bridgeAngle(site);}

// Extruded deck, anchored in both island surfaces. Supports and handrails
// are part of the exportable static level rather than viewport gizmos.
function bridge(b,glow,central,site,index){
  const to=[site.x-central.x,site.z-central.z],dist=Math.hypot(...to);
  const d=[to[0]/dist,to[1]/dist],p=[-d[1],d[0]],start=central.r*.966,end=dist-site.r*.96;
  const length=end-start,mid=(start+end)*.5;
  const x=central.x+d[0]*mid,z=central.z+d[1]*mid,yaw=Math.atan2(-d[1],d[0]);
  const rot=(t,v,y=0)=>[central.x+d[0]*t+p[0]*v,y,central.z+d[1]*t+p[1]*v];
  orientedBox(b,[x,-.20,z],[length+.95,.52,4.7],.22,P.ivory,yaw,4);
  orientedBox(b,[x,.068,z],[length+.97,.088,4.38],.032,P.tile,yaw,3);
  for(let j=0;j<Math.ceil(length/1.70);j++){
    const t=start+j*(length/Math.ceil(length/1.7))+.04;
    strip(b,[rot(t,-1.98)[0],rot(t,-1.98)[2]],
      [rot(t,1.98)[0],rot(t,1.98)[2]],.09,.121,
      j%3===0?P.rose:j%3===1?P.aqua:P.gold);
  }
  for(const side of [-1,1]){
    orientedBox(b,rot(mid,side*2.34,.31),[length+.5,.66,.34],.15,P.white,yaw,4);
    orientedBox(b,rot(mid,side*2.34,.75),[length+.6,.15,.37],.07,site.palette,yaw,3);
    const postCount=Math.ceil(length/3.5);
    for(let j=0;j<=postCount;j++){
      const t=start+(end-start)*j/postCount;
      lathe(b,rot(t,side*2.38)[0],rot(t,side*2.38)[2],
        [[.27,.13,P.white],[.32,.65,P.ivory],[.32,1.17,P.coral],[.36,1.27,P.white]],10);
      ellipsoid(glow,rot(t,side*2.38,1.39),[.21,.22,.21],P.glow,8,5);
    }
  }
  // Arch supports under deck visibly span the water.
  for(const t of [start+length*.31,start+length*.69]){
    for(const side of [-1,1]){
      tube(b,rot(t,side*1.65,-.46),rot(t+2.15,side*1.65,-2.92),.22,P.rockLight,8);
    }
  }
  // Geometry landing metadata for later Unity collider generation.
  return {from:central.id,to:site.id,fromX:rot(start,0)[0],fromZ:rot(start,0)[2],
    toX:rot(end,0)[0],toZ:rot(end,0)[2],length,width:4.7};
}
// Tiny themed geometry kits: each has at least one signature 3D structure and
// one social affordance; later these locations become networked minigames.
function skatePark(b,glow,site,detail){
  for(const basin of BOWLS)bowlMesh(b,glow,basin,Math.round(detail*.75));
  curvedRamp(b,-2.1,13.7,9.5,7.5,1.72,-.17);
  launchRamp(b,-13,5.8,5.5,6.6,1.4,.34,P.pale);
  launchRamp(b,15.4,9.7,4.1,4.6,1.55,Math.PI*.75,P.yellow);
  for(const [x,z,w,c] of [[-13,-1,2.4,P.yellow],[4,14,2.1,P.pink],[0,-15,2.7,P.blue]]){
    orientedBox(b,[x,.40,z],[w,.80,1.65],.18,c,.3,5);
    orientedBox(b,[x,.86,z],[w+.2,.13,1.74],.055,P.ivory,.3,4);
  }
  // Functional-looking kinked grind rail and two benches for spectators.
  const railPts=[[-17,0],[-15,1],[-11,1.7],[-8,2.7]];
  for(let j=0;j<railPts.length-1;j++)
    tube(b,[railPts[j][0],1.16,railPts[j][1]],
      [railPts[j+1][0],1.16,railPts[j+1][1]],.095,P.blueDark,9);
  for(const [x,z] of [[-15,1],[-10,2]]){
    tube(b,[x,.05,z],[x,1.1,z],.08,P.rock,7);
  }
  for(const [x,z,yaw] of [[-16,-15,0],[16,-14,.2],[-5,19,1.6]]){
    orientedBox(b,[x,.56,z],[4.0,.85,1.05],.30,P.coral,yaw,5);
    orientedBox(b,[x,.96,z],[4.2,.23,1.24],.10,P.yellow,yaw,4);
    orientedBox(b,[x,1.30,z-.38],[4.18,.62,.28],.10,P.ivory,yaw,4);
  }
  // Co-op toss blocks, a ball and a decorative little skateboard.
  const colors=[P.gold,P.coral,P.aqua,P.violet,P.blue];
  for(let i=0;i<9;i++){
    const x=-3+i%5*1.58,z=1+Math.floor(i/5)*1.58;
    orientedBox(b,[x,.42,z],[1.12,.84,1.12],.18,colors[i%5],(i%3)*.24,5);
  }
  for(const [x,z,r,c] of [[-2,-5,1.0,P.coral],[13,12,.68,P.aqua]]){
    ellipsoid(b,[x,r+.08,z],[r,r,r],c,16,10);
  }
  // Size-legible sign on an elevated but truly material-colored platform.
  billboard(b,-3,-18,'SKATE PARK',P.coral,0);
  for(const x of [-20,20])trough(b,x,0,1.35,3.7,311);
}
function friendsPlaza(b,glow,site){
  const {x,z}=site;
  annulus(b,x,z,4.7,6.4,.056,P.gold,54);
  disk(b,x,z,2.7,.065,P.paleBlue||P.cyan,32);
  fountain(b,x,z,.76);
  for(let j=0;j<3;j++){
    const a=j*TAU/3,r=8.2;
    const px=x+r*Math.cos(a),pz=z+r*Math.sin(a);
    archGate(b,glow,px,pz,3.3,4.20,a+Math.PI/2,
      [P.coral,P.aqua,P.violet][j],[P.yellow,P.cyan,P.lilac][j]);
  }
  for(let j=0;j<5;j++){
    const a=TAU*(j+.4)/5;
    arcBand(b,x,z,5.7,6.52,.20,.78,a,a+.61,P.rose,12);
    arcBand(b,x,z,6.26,6.64,.61,1.28,a,a+.61,P.ivory,12);
  }
  billboard(b,x,z-9.4,'FRIENDS',P.aqua);
}
function voiceLounge(b,glow,site){
  const {x,z}=site;
  lathe(b,x,z,[[4.05,.02,P.ivory],[4.4,.26,P.blue],[4.2,.40,P.ivory]],32);
  disk(glow,x,z,3.3,.42,P.lilac,40);
  for(let k=0;k<4;k++){
    const from=.15+k*TAU/4;
    arcBand(b,x,z,6.12,7.44,.14,.66,from,from+1.16,P.pink,18);
    arcBand(b,x,z,7.24,7.71,.45,1.26,from,from+1.16,P.white,18);
    arcBand(b,x,z,7.36,7.73,1.14,1.31,from,from+1.16,P.violet,18);
  }
  for(let k=0;k<4;k++){
    const a=k*TAU/4;
    const px=x+9.4*Math.cos(a),pz=z+9.4*Math.sin(a);
    lathe(b,px,pz,[[.48,.11,P.white],[.49,.68,P.violet],[.30,2.26,P.coral],[.42,2.45,P.ivory]],15);
    for(let j=0;j<3;j++){
      const rr=.76+j*.22;
      arcBand(glow,px,pz,rr,rr+.055,2.18+j*.14,2.25+j*.14,
        -.95,.95,P.cyan,12);
    }
  }
  ellipsoid(b,[x,1.27,z],[.37,.52,.37],P.cyan,14,9);
  tube(b,[x,.35,z],[x,.9,z],.09,P.ink,8);
  billboard(b,x,z-9.8,'VOICE',P.violet);
}
function sessionGates(b,glow,site){
  const {x,z}=site;
  for(let i=-1;i<=1;i++){
    const dx=i*6.2;
    orientedBox(b,[x+dx,.17,z+1.45],[5.5,.31,5.7],.30,
      i===-1?P.gold:i===0?P.aqua:P.rose,0,5);
    orientedBox(b,[x+dx,.39,z+1.45],[4.8,.14,5.10],.09,P.white,0,3);
    archGate(b,glow,x+dx,z+4.16,3.1,4.4,0,
      [P.gold,P.cyan,P.violet][i+1],
      [P.yellow,P.blue,P.lilac][i+1]);
    floorText(b,String(i+2),[x+dx,.57,z+.28],.40,.56,P.ink);
    for(let side of [-1,1])for(let j=0;j<3;j++){
      lathe(b,x+dx+side*2.6,z-2.25+j*.9,
        [[.18,.01,P.coral],[.20,.8,P.white],[.26,.90,P.gold]],9);
    }
  }
  billboard(b,x,z-9.7,'SESSIONS',P.cyan);
}
function physicsYard(b,glow,site){
  const {x,z}=site;
  const colors=[P.aqua,P.yellow,P.rose,P.violet,P.blue,P.mint];
  for(let k=0;k<23;k++){
    const xx=x-8+(k%5)*3.6,zz=z-5+Math.floor(k/5)*3.25;
    const h=.56+(k%4)*.33;
    orientedBox(b,[xx,h*.5+.09,zz],[2.3,h,2.4],.24,colors[(k*7)%colors.length],k*.13,5);
    if(k%4===0)ellipsoid(b,[xx,h+.72,zz],[.65,.64,.66],P.yellow,12,8);
  }
  // An unmistakable ball-tunnel toy and paired seesaws.
  for(let j=0;j<8;j++){
    const a=j*TAU/8;
    tube(b,[x-8+3*Math.cos(a),2.7,z+8+3*Math.sin(a)],
      [x-8+3*Math.cos(a+TAU/8),2.7,z+8+3*Math.sin(a+TAU/8)],.42,P.aqua,12);
  }
  for(const off of [-1,1]){
    orientedBox(b,[x+6,.43,z+7+off*2.8],[3.8,.41,1.12],.1,P.coral,off*.2,3);
    tube(b,[x+6,0,z+7+off*2.8],[x+6,.65,z+7+off*2.8],.21,P.ink,10);
  }
  billboard(b,x,z-10,'PHYSICS',P.coral);
}
function arcadeCabinet(b,glow,x,z,yaw,color,screen){
  orientedBox(b,[x,1.24,z],[1.65,2.48,1.45],.25,color,yaw,5);
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  const front=(a,h,d)=>[x+a*cs+d*sn,h,z-a*sn+d*cs];
  orientedBox(b,front(0,1.78,-.751),[1.34,.99,.105],.045,P.ink,yaw,3);
  orientedBox(glow,front(0,1.78,-.82),[1.12,.77,.062],.02,screen,yaw,3);
  orientedBox(b,front(0,1.05,-.83),[1.44,.16,.45],.045,P.white,yaw,3);
  for(const s of [-1,1])
    ellipsoid(b,front(s*.35,1.17,-1.04),[.12,.11,.12],P.coral,10,6);
  tube(b,front(-.32,1.08,-1.04),front(-.32,1.28,-1.04),.044,P.ink,8);
  ellipsoid(glow,front(0,2.53,-.12),[.36,.08,.08],P.glow,9,5);
}
function arcadeRoom(b,glow,site){
  const {x,z}=site;
  const n=8;
  for(let i=0;i<n;i++){
    const a=Math.PI*.12+i*(TAU*.78)/(n-1),r=8.4;
    const px=x+r*Math.cos(a),pz=z+r*Math.sin(a),yaw=-a+Math.PI*.5;
    arcadeCabinet(b,glow,px,pz,yaw,
      [P.lilac,P.violet,P.coral,P.aqua,P.blue][i%5],
      [P.aqua,P.yellow,P.coral][i%3]);
  }
  lathe(b,x,z,[[3.38,.03,P.gold],[3.44,.23,P.yellow],[2.91,.31,P.ivory]],32);
  annulus(glow,x,z,2.85,3.08,.335,P.violet,42);
  for(let i=0;i<4;i++){
    const a=TAU*i/4;
    orientedBox(b,[x+Math.cos(a)*4.6,.28,z+Math.sin(a)*4.6],
      [1.65,.38,1.44],.24,P.blue,a,4);
  }
  billboard(b,x,z-9.9,'ARCADE',P.violet);
}
function serverCabinet(b,glow,x,z,yaw,index){
  orientedBox(b,[x,1.6,z],[1.45,3.18,1.10],.15,P.blueDark,yaw,3);
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  const loc=(a,h,d)=>[x+a*cs+d*sn,h,z-a*sn+d*cs];
  for(let i=0;i<8;i++){
    orientedBox(b,loc(0,.36+i*.34,-.59),[1.19,.21,.07],.025,P.ink,yaw,2);
    const xx=loc(-.37+i%3*.22,.37+i*.34,-.67);
    ellipsoid(glow,xx,[.044,.034,.03],i%2?P.cyan:P.yellow,7,4);
  }
  orientedBox(glow,loc(0,3.02,-.6),[1.05,.115,.07],.025,index%2?P.aqua:P.coral,yaw,2);
}
function netLab(b,glow,site){
  const {x,z}=site;
  annulus(b,x,z,4.5,6.1,.06,P.blue,54);
  for(let i=0;i<4;i++){
    const rr=2.1+i*.78;
    arcBand(glow,x,z,rr,rr+.065,.11,.16,-Math.PI,Math.PI,P.aqua,28);
  }
  for(let i=0;i<7;i++){
    const a=TAU*i/7+.4,r=3.4;
    tube(glow,[x,1.55,z],[x+Math.cos(a)*r,.28,z+Math.sin(a)*r],.033,
      i%2?P.aqua:P.yellow,6);
    ellipsoid(glow,[x+Math.cos(a)*r,.29,z+Math.sin(a)*r],
      [.28,.28,.28],[P.coral,P.yellow,P.aqua][i%3],11,7);
  }
  ellipsoid(glow,[x,1.58,z],[1.16,1.16,1.16],P.blue,22,12);
  for(let k=0;k<8;k++){
    const a=k*TAU/8,xx=x+Math.cos(a)*9.12,zz=z+Math.sin(a)*9.12;
    serverCabinet(b,glow,xx,zz,-a+Math.PI*.5,k);
  }
  billboard(b,x,z-10,'NET LAB',P.blue);
}
function waterMesh(b,limit=184,detail=64,seed=1){
  const n=detail,pitch=limit/n,s=-limit*.5,y=-3.64;
  const vertices=[];
  for(let i=0;i<=n;i++){
    const row=[];
    for(let j=0;j<=n;j++){
      const x=s+i*pitch,z=s+j*pitch;
      const height=y+Math.sin(x*.17+seed)*.065+Math.sin(z*.21+x*.12)*.045;
      const color=mix(P.water,P.aqua,.22+.12*Math.sin(x*.32+z*.17));
      row.push(vertex([x,height,z],[0,1,0],color));
    }
    vertices.push(row);
  }
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)
    b.quad(vertices[i][j],vertices[i+1][j],vertices[i+1][j+1],vertices[i][j+1]);
}

function floatingRocks(b,random){
  const locations=[
    [-84,-57],[-29,-90],[28,-89],[85,-67],[-86,46],[83,71],
    [-47,77],[37,86],[2,-83],[-79,8],[81,9],[-25,77]];
  for(let k=0;k<locations.length;k++){
    const [x,z]=locations[k],s=.9+random()*.85;
    ellipsoid(b,[x,-2.95,z],[1.6*s,1.2*s,1.5*s],
      k%3?P.rock:P.rockLight,10,6,k*.7);
    if(k%2===0){
      ellipsoid(b,[x,.02,z],[.9*s,.33*s,.7*s],P.leaf,10,5);
      if(k%4===0)palm(b,x,z,2.8,k*.85);
    }
  }
}
function worldSites(config,graph){
  const palettes={skate:'aqua',friends:'gold',voice:'violet',
    sessions:'cyan',physics:'coral',arcade:'violet',network:'blue'};
  return graph.nodes.map(s=>({...s,
    palette:P[palettes[s.theme]]||P.aqua,
    seed:config.seed+Math.round(s.x*19+s.z*23),
    greenery:config.greenery}));
}
export function buildArchipelago(recipe={}){
  const config={...DEFAULT_ARCHIPELAGO,...recipe};
  for(const name of ['spread','detail','greenery','oceanSize','seed','islandCount','variation'])
    if(!Number.isFinite(config[name]))throw new Error('Invalid '+name);
  config.spread=clamp(config.spread,.90,1.35);
  config.detail=Math.round(clamp(config.detail,20,48));
  config.greenery=clamp(config.greenery,0,1.5);
  config.seed=config.seed|0;
  config.oceanSize=clamp(config.oceanSize,300,500);
  const graph=generateLayoutGraph(config);
  const sites=worldSites(config,graph),chunks=[],metadata={
    units:'meters',islands:[],bridges:[],
    version:4,recipe:graph.config,adjacency:graph.connections,
    spawnPoints:graph.spawnPoints,interactables:graph.interactables
  };
  for(const site of sites){
    const b=new MeshBucket(site.id+' solid'),glow=new MeshBucket(site.id+' emissive');
    const rand=makeRandom(site.seed);
    b.part('true irregular coastal slab with rocky cliffs and coping',()=>{
      islandTop(b,site,config.detail);
      cliff(b,glow,site,config.detail);
      pavers(b,site);
    });
    b.part('arcaded boundary, landscaping and site landing',()=>{
      rim(b,glow,site,config.detail,rand,sites,graph);
      shoreline(b,site,rand);
      activityBackdrop(b,glow,site);
    });
    b.part(site.name+' original procedural activity architecture',()=>{
      switch(site.theme){
        case 'skate':skatePark(b,glow,site,config.detail);break;
        case 'friends':friendsPlaza(b,glow,site);break;
        case 'voice':voiceLounge(b,glow,site);break;
        case 'sessions':sessionGates(b,glow,site);break;
        case 'physics':physicsYard(b,glow,site);break;
        case 'arcade':arcadeRoom(b,glow,site);break;
        case 'network':netLab(b,glow,site);break;
      }
    });
    chunks.push({name:site.id,solid:b.output(),emissive:glow.output()});
    metadata.islands.push({id:site.id,name:site.name,x:site.x,z:site.z,
      radius:site.r,theme:site.theme});
  }
  const b=new MeshBucket('bridges solid'),glow=new MeshBucket('bridges emissive');
  b.part('supported footbridges built from the recipe connectivity graph',()=>{
    const byId=new Map(sites.map(s=>[s.id,s]));
    for(const [i,edge] of graph.edges.entries())
      metadata.bridges.push({
        ...bridge(b,glow,byId.get(edge.from),byId.get(edge.to),i),
        id:edge.id
      });
  });
  chunks.push({name:'bridges',solid:b.output(),emissive:glow.output()});
  const ocean=new MeshBucket('ocean water');
  ocean.part('bakeable polygon ocean surface',()=>waterMesh(ocean,config.oceanSize,78,config.seed*.01));
  const rocks=new MeshBucket('ambient islets');
  rocks.part('distant decorative rock islands and palms',()=>floatingRocks(rocks,makeRandom(config.seed+9)));
  chunks.push({name:'ocean',solid:ocean.output(),emissive:new MeshBucket('nothing').output()});
  chunks.push({name:'offshore-rocks',solid:rocks.output(),emissive:new MeshBucket('nothing').output()});
  const stats=chunks.reduce((o,c)=>{
    for(const data of [c.solid,c.emissive]){
      o.triangles+=data.indices.length/3;o.vertices+=data.positions.length/3;
      if(data.indices.length)o.meshes++;
    }
    return o;
  },{triangles:0,vertices:0,meshes:0});
  return {config,chunks,metadata,stats};
}
