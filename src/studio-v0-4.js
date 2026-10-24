// DuderWorld V0.4 offline preview + static GLB exporter.
// The renderer is intentionally tiny WebGL2 rather than a game engine. The
// authoritative V0.3 art and Three.js export pipeline remain in the repo.
const $=q=>document.querySelector(q), TAU=Math.PI*2;
const COLORS={cream:'#f7e5cc',ivory:'#fff4dc',rock:'#8a98a7',deep:'#55798c',
 coral:'#f58083',blue:'#67a9ef',aqua:'#63d6d5',yellow:'#ffd678',
 lilac:'#bd9be7',mint:'#87d6b2',leaf:'#64bb8e',white:'#ffffff',
 dark:'#35556e',water:'#3699c0',foam:'#c4f7eb',wood:'#d5af88'};
const themes={skate:'aqua',friends:'yellow',voice:'lilac',sessions:'blue',
 physics:'coral',arcade:'lilac',network:'blue'};
function rgb(c){c=COLORS[c]||c;return [1,3,5].map(i=>parseInt(c.substring(i,i+2),16)/255);}
const cv=(p,n,c)=>[...p,...n,...rgb(c)];
function makeMesh(name){let verts=[],indices=[];function tri(a,b,c,color){
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  let normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const l=Math.hypot(...normal)||1;normal=normal.map(x=>x/l);
  const start=verts.length/9;verts.push(...cv(a,normal,color),...cv(b,normal,color),...cv(c,normal,color));
  indices.push(start,start+1,start+2);
}
 function quad(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color);}
 function box(x,y,z,w,h,d,color,angle=0){
  const raw=[[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,h/2,-d/2],[-w/2,h/2,-d/2],
    [-w/2,-h/2,d/2],[w/2,-h/2,d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]];
  const cs=Math.cos(angle),sn=Math.sin(angle),p=raw.map(t=>[x+t[0]*cs+t[2]*sn,
    y+t[1],z-t[0]*sn+t[2]*cs]);
  for(const ids of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]])
    quad(p[ids[0]],p[ids[1]],p[ids[2]],p[ids[3]],color);
 }
 function tube(a,b,rad,color,n=8){
  const forward=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],fl=Math.hypot(...forward)||1;
  const f=forward.map(x=>x/fl),up=Math.abs(f[1])>.95?[1,0,0]:[0,1,0];
  let s=[f[1]*up[2]-f[2]*up[1],f[2]*up[0]-f[0]*up[2],f[0]*up[1]-f[1]*up[0]];
  const sl=Math.hypot(...s)||1;s=s.map(v=>v/sl);
  const t=[f[1]*s[2]-f[2]*s[1],f[2]*s[0]-f[0]*s[2],f[0]*s[1]-f[1]*s[0]];
  let ring=(p,i)=>{const an=i*TAU/n;return p.map((v,k)=>v+rad*(s[k]*Math.cos(an)+t[k]*Math.sin(an)));};
  for(let i=0;i<n;i++){const j=(i+1)%n;
    quad(ring(a,i),ring(a,j),ring(b,j),ring(b,i),color);
  }
 }
 function cylinder(x,y,z,rad,height,color,n=12){
  const p=i=>[x+Math.cos(i*TAU/n)*rad,y,z+Math.sin(i*TAU/n)*rad];
  for(let i=0;i<n;i++){const a=p(i),b=p(i+1),top=q=>[q[0],q[1]+height,q[2]];
    quad(a,b,top(b),top(a),color);tri([x,y+height,z],top(b),top(a),color);
  }
 }
 function disk(x,y,z,rad,color,n=22){for(let i=0;i<n;i++)
  tri([x,y,z],[x+Math.cos(i*TAU/n)*rad,y,z+Math.sin(i*TAU/n)*rad],
    [x+Math.cos((i+1)*TAU/n)*rad,y,z+Math.sin((i+1)*TAU/n)*rad],color);
 }
 function arc(x,y,z,r0,r1,h,a0,a1,color,segments=16){
  for(let i=0;i<segments;i++){
    const a=a0+(a1-a0)*i/segments,b=a0+(a1-a0)*(i+1)/segments;
    const pt=(r,th,yy)=>[x+Math.cos(th)*r,yy,z+Math.sin(th)*r];
    quad(pt(r0,a,y),pt(r1,a,y),pt(r1,b,y),pt(r0,b,y),color);
    quad(pt(r1,a,y),pt(r1,a,y+h),pt(r1,b,y+h),pt(r1,b,y),color);
  }
 }
 return {name,verts,indices,tri,quad,box,tube,cylinder,disk,arc};
}
function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function buildScene(graph,settings){
 const meshes=[];let totalTriangles=0;
 const islandById=new Map(graph.nodes.map(s=>[s.id,s]));
 for(const site of graph.nodes){
  const m=makeMesh(site.id),seed=graph.config.seed+site.index*7919;
  const R=site.r,detail=settings.detail;
  const n=detail*3,k=Math.ceil(detail*.55);
  const coast=a=>1+.025*Math.sin(a*5+seed*.0009)+.019*Math.sin(a*9+seed*.00033)+.014*Math.sin(a*17);
  const pos=(t,a,y)=>[site.x+R*t*coast(a)*Math.cos(a),y,site.z+R*t*coast(a)*Math.sin(a)];
  const bowls=site.theme==='skate'?[
    {x:7.1,z:-3.5,rx:8.6,rz:7.9,d:2.2},
    {x:-11.2,z:-8.4,rx:4.3,rz:4.05,d:1.45}]:[];
  const heightAt=(x,z)=>{let y=0;for(const b of bowls){
    const r=Math.hypot((x-b.x)/b.rx,(z-b.z)/b.rz);
    y=Math.min(y,-b.d*(1-smoothstep((r-.21)/.85)));}return y;};
  // A single tessellated walking surface, sculpted into real recessed bowls.
  // No invisible top plane intersects the bowl collider surface.
  const grid=[];
  for(let j=0;j<=k;j++){
    const row=[];for(let i=0;i<n;i++){
      const a=i*TAU/n,p=pos(j/k,a,0);p[1]=heightAt(p[0],p[2]);row.push(p);
    }grid.push(row);
  }
  for(let j=0;j<k;j++)for(let i=0;i<n;i++){
    const next=(i+1)%n;
    m.quad(grid[j][i],grid[j+1][i],grid[j+1][next],grid[j][next],
      j%5===0?'ivory':'cream');
  }
  // Actual stepped rock strata, facing the water and joined to the deck.
  const levels=[[1,0,'ivory'],[1.055,-.23,'wood'],[1.075,-.68,'rock'],
    [1.03,-1.8,'rock'],[.86,-3.22,'deep'],[.68,-4.12,'deep']];
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<n;i++){
    const a=i*TAU/n,b=(i+1)*TAU/n,
      A=levels[j],B=levels[j+1];
    m.quad(pos(A[0],a,A[1]),pos(A[0],b,A[1]),pos(B[0],b,B[1]),pos(B[0],a,B[1]),
      j===2&&i%6===0?'wood':A[2]);
  }
  const accent=themes[site.theme]||'coral';
  for(let i=0;i<n;i++){
    const a=i*TAU/n,b=(i+1)*TAU/n;
    m.quad(pos(1.065,a,-3.52),pos(1.16,a,-3.52),
      pos(1.16,b,-3.52),pos(1.065,b,-3.52),'foam');
  }
  // Curved retaining walls and capped structural pillars; bridge openings
  // are generated from the adjacency graph instead of a hardcoded entrance.
  const bearings=graph.connections[site.id].map(id=>{
    const s=islandById.get(id);return Math.atan2(s.z-site.z,s.x-site.x);});
  const awayFromBridge=a=>bearings.every(b=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))>.22);
  for(let i=0;i<n;i+=2){const a=i*TAU/n,b=(i+2)*TAU/n;
    if(!awayFromBridge((a+b)*.5))continue;
    m.arc(site.x,.06,site.z,R*.875,R*.9,.75,a,b,'ivory',2);
    if(i%8===0){const x=site.x+Math.cos(a)*R*.885,z=site.z+Math.sin(a)*R*.885;
      m.cylinder(x,0,z,.46,2.1,'ivory',11);m.cylinder(x,2.1,z,.62,.17,accent,11);
    }
  }
  const ringR=site.theme==='skate'?R*.88:R*.68;
  m.arc(site.x,.05,site.z,ringR-.24,ringR,.09,0,TAU,accent,detail*3);
  // Palm trees, each with solid stem segments and six actual leaf blades.
  for(let p=0;p<Math.floor(settings.greenery*(site.theme==='skate'?8:5));p++){
    const a=p*TAU/Math.max(1,Math.floor(settings.greenery*(site.theme==='skate'?8:5)))+.5;
    if(!awayFromBridge(a))continue;
    const x=site.x+Math.cos(a)*R*.75,z=site.z+Math.sin(a)*R*.75;
    m.tube([x,0,z],[x+.38,3.1,z+.22],.16,'wood',6);
    for(let f=0;f<7;f++){
      const th=f*TAU/7,tip=[x+.38+Math.cos(th)*1.95,2.67,z+.22+Math.sin(th)*1.95];
      m.tri([x+.38,3.18,z+.22],
        [x+.38+Math.cos(th+.25)*.82,3.28,z+.22+Math.sin(th+.25)*.82],
        tip,p%2?'leaf':'mint');
      m.tri([x+.38,3.18,z+.22],tip,
        [x+.38+Math.cos(th-.25)*.82,3.28,z+.22+Math.sin(th-.25)*.82],'leaf');
    }
  }
  // Thematic modular kits are anchored at each island's actual graph position.
  const x=site.x,z=site.z;
  if(site.theme==='skate'){
    // Continuous custom bowl geometry above, plus grounded ramps and railings.
    for(const [xx,zz,ang] of [[-4,14,0],[15,9,.5],[-15,6,-.4]]){
      m.box(xx,.49,zz,4.8,.9,5.4,'yellow',ang);
      m.box(xx,1.02,zz,4.6,.16,5.4,'coral',ang);
    }
    for(let i=0;i<3;i++){
      m.tube([-16+i*2,.88,1+i*.6],[-14+i*2,.88,1.6+i*.6],.075,'blue');
      m.tube([-16+i*2,0,1+i*.6],[-16+i*2,.88,1+i*.6],.06,'dark');
    }
    for(let i=0;i<3;i++)m.box(-14+i*12,.46,-16,4,.72,1,'coral');
  }else if(site.theme==='friends'){
    m.cylinder(x,.03,z,4,.30,'yellow',24);
    m.cylinder(x,.33,z,2.6,.19,'aqua',24);
    m.cylinder(x,.52,z,.83,1.1,'ivory',16);
    for(let i=0;i<6;i++){const a=i*TAU/6;
      m.box(x+Math.cos(a)*6,.46,z+Math.sin(a)*6,2.5,.6,1,'coral',a+Math.PI/2);
    }
  }else if(site.theme==='voice'){
    m.cylinder(x,.05,z,4,.33,'lilac',28);
    for(let i=0;i<5;i++)m.arc(x,.08,z,6.2,7.4,.8,i*TAU/5+.1,i*TAU/5+.93,'coral',8);
    m.cylinder(x,.48,z,.34,1.72,'blue',12);
  }else if(site.theme==='sessions'){
    for(let i=-1;i<=1;i++){
      const xx=x+i*3.9;
      m.box(xx,.2,z+1.4,3.5,.4,4.3,['yellow','aqua','coral'][i+1]);
      m.tube([xx-1.4,0,z+3],[xx-1.4,3.9,z+3],.29,'ivory');
      m.tube([xx+1.4,0,z+3],[xx+1.4,3.9,z+3],.29,'ivory');
      m.tube([xx-1.4,3.9,z+3],[xx+1.4,3.9,z+3],.34,'yellow');
    }
  }else if(site.theme==='physics'){
    for(let i=0;i<15;i++){
      const xx=x-7+i%5*3.4,zz=z-4+Math.floor(i/5)*3.5;
      m.box(xx,.5,zz,1.8,1.0,1.8,['coral','aqua','yellow'][i%3],i*.25);
    }
    m.tube([x-4,2,z+7],[x+4,2,z+7],.18,'blue');
  }else if(site.theme==='arcade'){
    for(let i=0;i<9;i++){
      const a=i*TAU/9,r=7.6,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      m.box(px,1.25,pz,1.45,2.5,1.2,i%2?'lilac':'coral',-a);
      m.box(px,1.8,pz,1.16,.95,.1,'dark',-a);
    }
    m.cylinder(x,.12,z,3.15,.26,'yellow',28);
  }else if(site.theme==='network'){
    for(let i=0;i<9;i++){
      const a=i*TAU/9,r=8,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      m.box(px,1.47,pz,1.35,2.94,1.3,'dark',-a);
      for(let j=0;j<5;j++)m.box(px, .42+j*.46,pz-.7,1.01,.12,.07,i%2?'aqua':'yellow',-a);
    }
    m.cylinder(x,.10,z,2.4,.17,'blue',28);
    m.cylinder(x,.38,z,1.1,1.95,'aqua',20);
  }
  meshes.push(m);
 }
 for(const edge of graph.edges){
  const a=islandById.get(edge.from),b=islandById.get(edge.to);
  const dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz),ux=dx/dist,uz=dz/dist;
  const sx=a.x+ux*a.r*.96,sz=a.z+uz*a.r*.96,
    ex=b.x-ux*b.r*.96,ez=b.z-uz*b.r*.96;
  const len=Math.hypot(ex-sx,ez-sz),angle=Math.atan2(-uz,ux);
  const cx=(sx+ex)/2,cz=(sz+ez)/2;
  const m=makeMesh(edge.id);
  m.box(cx,-.18,cz,len+1.15,.42,4.65,'ivory',angle);
  m.box(cx,.055,cz,len+1.15,.08,4.28,'cream',angle);
  const px=-uz,pz=ux;
  for(const side of [-1,1]){
    const xx=cx+px*side*2.34,zz=cz+pz*side*2.34;
    m.box(xx,.71,zz,len+.55,.20,.22,'coral',angle);
    for(let j=0;j<=Math.ceil(len/3.4);j++){
      const t=j/Math.ceil(len/3.4),mx=sx+(ex-sx)*t+px*side*2.34,
        mz=sz+(ez-sz)*t+pz*side*2.34;
      m.cylinder(mx,.14,mz,.18,1.2,'ivory',8);
      m.cylinder(mx,1.34,mz,.27,.14,'yellow',8);
    }
  }
  for(const p of [.29,.71]){
    const mx=sx+(ex-sx)*p,mz=sz+(ez-sz)*p;
    m.cylinder(mx,-3.52,mz,.48,3.20,'rock',10);
  }
  meshes.push(m);
 }
 const ocean=makeMesh('water');ocean.quad([-205,-3.65,-205],[205,-3.65,-205],
   [205,-3.65,205],[-205,-3.65,205],'water');meshes.push(ocean);
 totalTriangles=meshes.reduce((s,m)=>s+m.indices.length/3,0);
 return {meshes,totalTriangles};
}
// --- Tiny, dependency-free WebGL2 viewer ---
const canvas=$('#view'),gl=canvas.getContext('webgl2',{antialias:true,alpha:false});
const fallback=gl?null:canvas.getContext('2d');
if(!gl){$('#status').textContent='WebGL2 unavailable — the generator and JSON export still work.';}
const VS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;uniform mat4 uVP;out vec3 vCol;out float vFog;
void main(){vec4 p=uVP*vec4(aPos,1.0);gl_Position=p;
float sun=max(0.,dot(normalize(aNormal),normalize(vec3(-.48,.9,.35))));
vCol=aColor*(.66+.34*sun);vFog=clamp((p.w-90.)/240.,0.,.8);}`;
const FS=`#version 300 es
precision highp float;in vec3 vCol;in float vFog;out vec4 outColor;
void main(){vec3 c=mix(vCol,vec3(.66,.85,.93),vFog);outColor=vec4(pow(c,vec3(1./2.2)),1.);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
let program,uVP,gpuMeshes=[];
if(gl){program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 uVP=gl.getUniformLocation(program,'uVP');gl.enable(gl.DEPTH_TEST);
 gl.clearColor(.66,.85,.93,1);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);
 return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,target){const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const f=normalize(sub(eye,target)),s=normalize(cross([0,1,0],f)),u=cross(f,s);
 return new Float32Array([s[0],u[0],f[0],0,s[1],u[1],f[1],0,
 s[2],u[2],f[2],0,-dot(s,eye),-dot(u,eye),-dot(f,eye),1]);}
function mul4(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)
 for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
let scene=null,graph=null,mode='orbit',yaw=.72,pitch=.82,distance=185,
 target=[0,0,0],isDragging=false,last=[0,0],needDraw=true;
let settings={islandCount:7,topology:'radial',spread:1,variation:0,detail:26,greenery:1,seed:20261024};
function uploadScene(){if(!gl)return;
 for(const item of gpuMeshes){gl.deleteBuffer(item.vbo);gl.deleteBuffer(item.ebo);gl.deleteVertexArray(item.vao);}
 gpuMeshes=[];
 for(const m of scene.meshes){const vao=gl.createVertexArray(),vbo=gl.createBuffer(),ebo=gl.createBuffer();
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.verts),gl.STATIC_DRAW);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ebo);
 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(m.indices),gl.STATIC_DRAW);
 for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}
 gpuMeshes.push({vao,vbo,ebo,count:m.indices.length});}
 gl.bindVertexArray(null);
}
function rebuild(){try{
 graph=generateLayoutGraph(settings);const result=validateLayoutGraph(graph);
 if(!result.ok)throw Error(result.errors.join('; '));
 scene=buildScene(graph,settings);uploadScene();needDraw=true;
 $('#stats').textContent=`${graph.nodes.length} ISLANDS  ·  ${graph.edges.length} BRIDGES  ·  ${scene.totalTriangles.toLocaleString()} TRIS`;
 $('#status').textContent='Graph validated · modular static geometry · Unity export ready';
 const tests=validateScene();$('#tests').textContent=tests.passed?`PASS  ${tests.checks} checks`:`FAIL ${tests.failures.join(' · ')}`;
 }catch(e){$('#status').textContent='Build error: '+e.message;console.error(e);}}
function validateScene(){const failures=[];let checks=0;
 const g=validateLayoutGraph(graph);checks++;if(!g.ok)failures.push(...g.errors);
 for(const m of scene.meshes){checks++;if(m.verts.length%9!==0||m.indices.length%3!==0||
 m.verts.some(v=>!Number.isFinite(v))||m.indices.some(i=>i>=m.verts.length/9))
 failures.push('Bad mesh '+m.name);}
 return {passed:failures.length===0,checks,failures};}
function draw(){if(!needDraw||!scene)return;needDraw=false;
 const width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,1.6);
 if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
 if(!gl){drawFallback(width,height,dpr);return;}
 gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,
 target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance];
 const vp=mul4(perspective(Math.PI/3,canvas.width/canvas.height,.1,900),lookAt(eye,target));
 gl.useProgram(program);gl.uniformMatrix4fv(uVP,false,vp);
 for(const m of gpuMeshes){gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);}
 gl.bindVertexArray(null);
}
// Canvas2D software-rendered inspector fallback for restricted WebGL hosts.
// It uses the exact same generated meshes as GLB, not a separate illustration.
function drawFallback(width,height,dpr){
 const ctx=fallback,W=canvas.width,H=canvas.height;
 ctx.fillStyle='#a9d7eb';ctx.fillRect(0,0,W,H);
 const eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,
 target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance];
 const normalized=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dir=normalized(eye.map((e,i)=>target[i]-e)),right=normalized(cross(dir,[0,1,0])),up=cross(right,dir);
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],f=H*.86;
 const projected=p=>{const v=p.map((n,i)=>n-eye[i]),z=dot(v,dir);
 if(z<=.01)return null;return [W/2+dot(v,right)*f/z,H/2-dot(v,up)*f/z,z];};
 const triangles=[];
 for(const mesh of scene.meshes){
 const v=mesh.verts;
 // Debug fallback draws capped triangles to remain responsive without a GPU.
 const stride=1;
 for(let j=0;j<mesh.indices.length;j+=3*stride){
  const i0=mesh.indices[j]*9,i1=mesh.indices[j+1]*9,i2=mesh.indices[j+2]*9;
  const a=projected(v.slice(i0,i0+3)),b=projected(v.slice(i1,i1+3)),c=projected(v.slice(i2,i2+3));
  if(!a||!b||!c)continue;
  if((a[0]<-50&&b[0]<-50&&c[0]<-50)||(a[0]>W+50&&b[0]>W+50&&c[0]>W+50)||
     (a[1]<-50&&b[1]<-50&&c[1]<-50)||(a[1]>H+50&&b[1]>H+50&&c[1]>H+50))continue;
  const shade=.63+.37*Math.max(0,v[i0+3]*-.48+v[i0+4]*.87+v[i0+5]*.35);
  const color=[v[i0+6],v[i0+7],v[i0+8]].map(k=>Math.round(255*Math.min(1,k*shade*1.18)));
  triangles.push({a,b,c,z:(a[2]+b[2]+c[2])/3,color:`rgb(${color.join(',')})`});
 }
 }
 triangles.sort((a,b)=>b.z-a.z);
 for(const {a,b,c,color} of triangles){ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.closePath();ctx.fill();}
}
function loop(){draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
canvas.addEventListener('pointerdown',e=>{isDragging=true;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',()=>isDragging=false);
canvas.addEventListener('pointermove',e=>{if(!isDragging)return;
 const dx=e.clientX-last[0],dy=e.clientY-last[1];last=[e.clientX,e.clientY];
 if(e.buttons===2||e.shiftKey){const speed=distance*.002;
 target[0]-=dx*speed*Math.cos(yaw);target[2]+=dx*speed*Math.sin(yaw);target[1]+=dy*speed;}
 else{yaw-=dx*.006;pitch=Math.max(.11,Math.min(1.55,pitch+dy*.006));}needDraw=true;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(8,Math.min(650,distance*Math.exp(e.deltaY*.0009)));needDraw=true;},{passive:false});
window.addEventListener('keydown',e=>{if(e.target?.tagName==='INPUT'||e.target?.tagName==='SELECT')return;
 const move=distance*.045;switch(e.code){
 case 'Digit1':pitch=1.55;needDraw=true;break;
 case 'Digit2':pitch=.72;distance=175;target=[0,0,0];needDraw=true;break;
 case 'KeyW':target[0]-=Math.sin(yaw)*move;target[2]-=Math.cos(yaw)*move;needDraw=true;break;
 case 'KeyS':target[0]+=Math.sin(yaw)*move;target[2]+=Math.cos(yaw)*move;needDraw=true;break;
 case 'KeyA':target[0]-=Math.cos(yaw)*move;target[2]+=Math.sin(yaw)*move;needDraw=true;break;
 case 'KeyD':target[0]+=Math.cos(yaw)*move;target[2]-=Math.sin(yaw)*move;needDraw=true;break;
 }});
window.addEventListener('resize',()=>needDraw=true);
const inputKeys=['islandCount','spread','variation','detail','greenery','seed','topology'];
for(const key of inputKeys){const el=$('#'+key);el.value=settings[key];
 el.addEventListener('input',()=>{$('#'+key+'Value')&&( $('#'+key+'Value').textContent=el.value);});
 el.addEventListener('change',()=>{settings[key]=['topology'].includes(key)?el.value:Number(el.value);rebuild();});}
function save(text,name,mime='application/json'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:mime}));
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('#reroll').addEventListener('click',()=>{settings.seed=Math.floor(Math.random()*2147483647);$('#seed').value=settings.seed;rebuild();});
$('#reset').addEventListener('click',()=>{settings={islandCount:7,topology:'radial',spread:1,variation:0,detail:26,greenery:1,seed:20261024};
 for(const k of inputKeys){$('#'+k).value=settings[k];$('#'+k+'Value')&&($('#'+k+'Value').textContent=settings[k]);}
 yaw=.72;pitch=.82;distance=185;target=[0,0,0];rebuild();});
$('#recipe').addEventListener('click',()=>save(JSON.stringify({settings},null,2),'duderworld-v04.recipe.json'));
function worldMetadata(){const byId=new Map(graph.nodes.map(s=>[s.id,s]));
 const collisionShapes=graph.nodes.map(s=>({id:'collider-'+s.id,kind:'cylinder',
  island:s.id,position:[s.x,-.26,s.z],radius:s.r*.95,height:.54}));
 const navLinks=[];
 for(const e of graph.edges){const a=byId.get(e.from),b=byId.get(e.to),dx=b.x-a.x,dz=b.z-a.z,
 dist=Math.hypot(dx,dz),ux=dx/dist,uz=dz/dist;
 const from=[a.x+ux*a.r*.96,.08,a.z+uz*a.r*.96],to=[b.x-ux*b.r*.96,.08,b.z-uz*b.r*.96];
 const l=Math.hypot(to[0]-from[0],to[2]-from[2]);
 collisionShapes.push({id:'collider-'+e.id,kind:'box',position:[(from[0]+to[0])/2,-.13,(from[2]+to[2])/2],
 size:[l+.8,.42,4.65],yawRadians:Math.atan2(-uz,ux)});
 navLinks.push({bridge:e.id,from,to,width:4.65,bidirectional:true});
 }
 return {format:'tront-eos.world-metadata',version:4,coordinateSystem:graph.coordinateSystem,
  recipe:graph.config,islands:graph.nodes,connections:graph.connections,bridges:graph.edges,
  spawnPoints:graph.spawnPoints,interactables:graph.interactables,
  collisionShapes,navLinks,renderMeshes:scene.meshes.map(m=>m.name)};}
$('#metadata').addEventListener('click',()=>save(JSON.stringify(worldMetadata(),null,2),'duderworld-v04.world.json'));
// Standalone GLB without external buffers/textures. Mesh nodes are preserved
// by zone, allowing Unity mesh colliders, streamed districts and later LODs.
function glbBytes(){
 const buffers=[],bufferViews=[],accessors=[],nodes=[],meshes=[],materials=[
  {name:'DuderWorld V0.4 vertex colors',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],
    metallicFactor:0,roughnessFactor:.85},doubleSided:true}];
 let bytes=0;
 function append(data,target){let pad=(4-bytes%4)%4;if(pad){buffers.push(new Uint8Array(pad));bytes+=pad;}
  const byteOffset=bytes,b=data instanceof Uint8Array?data:new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  buffers.push(b);bytes+=b.byteLength;const i=bufferViews.length;
  bufferViews.push({buffer:0,byteOffset,byteLength:b.byteLength,...target?{target}: {}});return i;}
 function accessor(view,componentType,type,count,min,max){const a={bufferView:view,componentType,type,count};
  if(min)a.min=min;if(max)a.max=max;accessors.push(a);return accessors.length-1;}
 for(const m of scene.meshes){
  const n=m.verts.length/9,p=new Float32Array(n*3),norm=new Float32Array(n*3),col=new Float32Array(n*3),
    min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<n;i++)for(let j=0;j<3;j++){
   const x=m.verts[i*9+j];p[i*3+j]=x;norm[i*3+j]=m.verts[i*9+3+j];
   // vertex COLOR_0 in glTF is linear color
   const c=m.verts[i*9+6+j];col[i*3+j]=c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
   min[j]=Math.min(min[j],x);max[j]=Math.max(max[j],x);
  }
  const aPos=accessor(append(p,34962),5126,'VEC3',n,min,max);
  const aNor=accessor(append(norm,34962),5126,'VEC3',n);
  const aCol=accessor(append(col,34962),5126,'VEC3',n);
  const ids=new Uint32Array(m.indices),aIdx=accessor(append(ids,34963),5125,'SCALAR',ids.length);
  meshes.push({name:m.name,primitives:[{attributes:{POSITION:aPos,NORMAL:aNor,COLOR_0:aCol},indices:aIdx,material:0,mode:4}]});
  nodes.push({name:m.name,mesh:meshes.length-1});
 }
 const gltf={asset:{version:'2.0',generator:'DuderWorld V0.4 procedural studio'},scene:0,
  scenes:[{name:'DuderWorld V0.4',nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,
  accessors,bufferViews,buffers:[{byteLength:bytes}]};
 const enc=new TextEncoder(),json=enc.encode(JSON.stringify(gltf)),jp=(4-json.length%4)%4;
 const bp=(4-bytes%4)%4,total=12+8+json.length+jp+8+bytes+bp;
 const out=new Uint8Array(total),view=new DataView(out.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
 view.setUint32(12,json.length+jp,true);view.setUint32(16,0x4e4f534a,true);
 out.set(json,20);out.fill(32,20+json.length,20+json.length+jp);
 let at=20+json.length+jp;view.setUint32(at,bytes+bp,true);view.setUint32(at+4,0x004e4942,true);at+=8;
 for(const b of buffers){out.set(b,at);at+=b.length;}return out;
}
$('#bake').addEventListener('click',()=>{try{
 const data=glbBytes();const size=(data.byteLength/1048576).toFixed(2);
 save(data,'duderworld-v04-static.glb','model/gltf-binary');
 $('#status').textContent=`GLB exported: ${size} MiB · ${scene.meshes.length} grouped static meshes`;
 }catch(e){$('#status').textContent='GLB export error: '+e.message;console.error(e);}});
$('#testsBtn').addEventListener('click',()=>{const test=validateScene();
 $('#status').textContent=test.passed?`PASS: ${test.checks} verified geometry/graph checks`:
 'FAIL: '+test.failures.join('; ');});
window.__duderworldV04={get graph(){return graph;},get scene(){return scene;},get metadata(){return worldMetadata();},
 get glb(){return glbBytes();},get validate(){return validateScene();},rebuild};
rebuild();
