// Continuous filleted arc solids. Tessellation follows curvature; flat spans
// receive no arbitrary grid subdivision. End caps are round in plan, with the
// same rolled top/bottom profile as the walls (no overlapping tube segments).
const TAU=Math.PI*2;
const v=(p,n,c)=>({p,n,c});
export function distanceToArc(x,z,cx,cz,r,a0,a1){
  const angle=((Math.atan2(z-cz,x-cx)-a0)%TAU+TAU)%TAU+a0;
  if(angle<=a1)return Math.abs(Math.hypot(x-cx,z-cz)-r);
  return Math.min(...[a0,a1].map(a=>Math.hypot(x-cx-r*Math.cos(a),z-cz-r*Math.sin(a))));
}
export function roomWalkable(rooms,x,z,bodyRadius=.34){
  return rooms.every(room=>{
    const [cx,,cz]=room.center;
    if(Math.hypot(x-cx,z-cz)<room.centerKeepout+bodyRadius)return false;
    for(const [a0,a1] of room.wallArcs)
      if(distanceToArc(x,z,cx,cz,room.wallRadius,a0,a1)<room.wallWidth/2+bodyRadius)return false;
    for(const [a0,a1] of room.seatingArcs)
      if(distanceToArc(x,z,cx,cz,6.75,a0,a1)<.775+bodyRadius)return false;
    return true;
  });
}
export function roundedArc(b,{x=0,z=0,r,width,y0,y1,a0=0,a1=TAU,
  bevel=.16,color,detail=32}){
  const half=width/2,fillet=Math.min(bevel,half*.96,(y1-y0)*.48);
  const profile=[],steps=3;
  for(let i=0;i<=steps;i++){
    const t=i/steps*Math.PI/2;
    profile.push({q:half-fillet+fillet*Math.sin(t),y:y0+fillet-fillet*Math.cos(t),nr:Math.sin(t),ny:-Math.cos(t)});
  }
  for(let i=0;i<=steps;i++){
    const t=i/steps*Math.PI/2;
    profile.push({q:half-fillet+fillet*Math.cos(t),y:y1-fillet+fillet*Math.sin(t),nr:Math.cos(t),ny:Math.sin(t)});
  }
  const n=Math.max(2,Math.ceil((a1-a0)*Math.max(8,detail*.40)));
  for(const sign of [-1,1]){
    const make=(a,p)=>v([x+(r+sign*p.q)*Math.cos(a),p.y,z+(r+sign*p.q)*Math.sin(a)],
      [sign*p.nr*Math.cos(a),p.ny,sign*p.nr*Math.sin(a)],color);
    for(let i=0;i<n;i++)for(let j=0;j<profile.length-1;j++){
      const a=a0+(a1-a0)*i/n,c=a0+(a1-a0)*(i+1)/n;
      b.quad(make(a,profile[j]),make(c,profile[j]),make(c,profile[j+1]),make(a,profile[j+1]));
    }
  }
  for(const [p,up] of [[profile[0],-1],[profile.at(-1),1]]){
    const at=(a,s)=>v([x+(r+s*p.q)*Math.cos(a),p.y,z+(r+s*p.q)*Math.sin(a)],[0,up,0],color);
    for(let i=0;i<n;i++){
      const a=a0+(a1-a0)*i/n,c=a0+(a1-a0)*(i+1)/n;
      b.quad(at(a,-1),at(a,1),at(c,1),at(c,-1));
    }
  }
  if(a1-a0>TAU-1e-5)return;
  // Semicircular footprint at either end, rolled continuously into the crown.
  const capSteps=10;
  for(const [angle,direction] of [[a0,-1],[a1,1]]){
    const cx=x+r*Math.cos(angle),cz=z+r*Math.sin(angle);
    const at=(t,p)=>{const a=angle+direction*t;
      return v([cx+p.q*Math.cos(a),p.y,cz+p.q*Math.sin(a)],
        [p.nr*Math.cos(a),p.ny,p.nr*Math.sin(a)],color);};
    for(let i=0;i<capSteps;i++)for(let j=0;j<profile.length-1;j++){
      const a=Math.PI*i/capSteps,c=Math.PI*(i+1)/capSteps;
      b.quad(at(a,profile[j]),at(c,profile[j]),at(c,profile[j+1]),at(a,profile[j+1]));
    }
    for(const [p,up] of [[profile[0],-1],[profile.at(-1),1]])for(let i=0;i<capSteps;i++){
      const a=at(Math.PI*i/capSteps,p),c=at(Math.PI*(i+1)/capSteps,p);
      b.tri(v([cx,p.y,cz],[0,up,0],color),{...a,n:[0,up,0]},{...c,n:[0,up,0]});
    }
  }
}

// Return uninterrupted arcs outside all actual bridge approach corridors.
// extraAngles permit intentional sea-facing openings without changing nav.
export function roomArcs(site,sites,graph,{radius=9.6,halfClearance=3.2,extraAngles=[]}={}){
  const angles=graph.connections[site.id].map(id=>{
    const s=sites.find(s=>s.id===id);return Math.atan2(s.z-site.z,s.x-site.x);
  }).concat(extraAngles);
  const half=Math.asin(Math.min(.9,halfClearance/radius));
  const cuts=[];
  for(const a of angles){const c=(a%TAU+TAU)%TAU;
    for(const d of [-TAU,0,TAU]){
      const lo=Math.max(0,c+d-half),hi=Math.min(TAU,c+d+half);if(hi>lo)cuts.push([lo,hi]);
    }
  }
  cuts.sort((a,b)=>a[0]-b[0]);const merged=[];
  for(const cut of cuts){const prev=merged.at(-1);if(prev&&cut[0]<=prev[1])prev[1]=Math.max(prev[1],cut[1]);else merged.push([...cut]);}
  const arcs=[];let cursor=0;
  for(const [lo,hi] of merged){if(lo-cursor>.05)arcs.push([cursor,lo]);cursor=hi;}
  if(TAU-cursor>.05)arcs.push([cursor,TAU]);
  if(arcs.length>1&&arcs[0][0]===0&&arcs.at(-1)[1]===TAU){const first=arcs.shift();arcs.at(-1)[1]=TAU+first[1];}
  return {arcs,entrances:angles,clearance:halfClearance*2};
}

export function sweepArch(b,glow,{x,z,width,height,yaw,color,accent}){
  const half=width/2,shoulder=height-half,cs=Math.cos(yaw),sn=Math.sin(yaw);
  const rings=[],steps=24,sides=12;
  const path=[{a:-half,y:.2,nx:-1,ny:0}];
  for(let i=0;i<=steps;i++){const t=Math.PI-i*Math.PI/steps;
    path.push({a:half*Math.cos(t),y:shoulder+half*Math.sin(t),nx:Math.cos(t),ny:Math.sin(t)});}
  path.push({a:half,y:.2,nx:1,ny:0});
  for(const p of path){const row=[];
    for(let j=0;j<sides;j++){const q=TAU*j/sides,cc=Math.cos(q),ss=Math.sin(q),rad=.38;
      const lx=p.a+rad*cc*p.nx,lz=rad*ss;
      row.push(v([x+lx*cs+lz*sn,p.y+rad*cc*p.ny,z-lx*sn+lz*cs],
        [cc*p.nx*cs+ss*sn,cc*p.ny,-cc*p.nx*sn+ss*cs],color));}
    rings.push(row);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++)b.quad(rings[i][j],rings[i][(j+1)%sides],rings[i+1][(j+1)%sides],rings[i+1][j]);
  for(const k of [0,rings.length-1])for(let j=0;j<sides;j++){
    const p=path[k],n=[0,-1,0];b.tri(v([x+p.a*cs,p.y,z-p.a*sn],n,color),{...rings[k][j],n},{...rings[k][(j+1)%sides],n});}
}
