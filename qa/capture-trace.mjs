// Capture actual generated mesh buffers with a minimal independent GLES shader.
// This is a geometry/image smoke test, NOT a Three.js shader/performance test.
// node qa/capture-trace.mjs oblique|topdown output/trace.json
import {buildWorld} from '../src/world.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const [mode='oblique',out='output/trace.json',outline='off']=process.argv.slice(2);
if(!['oblique','topdown'].includes(mode))throw Error('view must be oblique or topdown');
const vs=`#version 300 es
precision highp float;layout(location=0) in vec3 position;layout(location=1) in vec3 normal;
layout(location=2) in vec3 color;uniform mat4 uMvp;uniform float uExpand;
out vec3 vNormal;out vec3 vColor;out vec3 vPosition;
void main(){vNormal=normal;vColor=color;vPosition=position;
gl_Position=uMvp*vec4(position+normal*uExpand,1.);}`;
const fs=`#version 300 es
precision highp float;in vec3 vNormal;in vec3 vColor;in vec3 vPosition;
uniform int uMode;out vec4 pixel;
void main(){if(uMode==1){pixel=vec4(.155,.195,.207,1.);return;}
if(uMode==2){pixel=vec4(mix(vColor,vec3(1.),.14),1.);return;}
vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.4,.85,.32));
float lambert=max(0.,dot(n,light));float lighting=.71+.30*lambert;
float cavity=1.-clamp((.24-vPosition.y)*.32,0.,.10);
pixel=vec4(vColor*lighting*cavity,1.);}`;
const w=1600,h=980;
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const d=Math.hypot(...a);return a.map(v=>v/d)};
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const eye=mode==='topdown'?[0,31.8,0]:[19.7,25.9,-22.8],target=[0,1.5,0],up=mode==='topdown'?[0,0,1]:[0,1,0];
const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);
const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
const f=1/Math.tan((mode==='topdown'?Math.PI/3.7:Math.PI/3.1)/2),near=.1,far=180,p=1/(near-far);
const proj=[f/(w/h),0,0,0,0,f,0,0,0,0,(far+near)*p,-1,0,0,2*far*near*p,0];
const mvp=Array.from({length:16},(_,i)=>{
  const c=Math.floor(i/4),r=i%4;let sum=0;for(let k=0;k<4;k++)sum+=proj[k*4+r]*view[c*4+k];return sum;
});
const pack=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
const meshes=buildWorld();
function draw(mesh,shell=false,glow=false){return {
  vs,fs,method:'drawElements',mode:4,count:mesh.indices.length,
  uniqueVertices:mesh.positions.length/3,
  attributes:[
    {loc:0,size:3,type:0x1406,data:pack(mesh.positions)},
    {loc:1,size:3,type:0x1406,data:pack(mesh.normals)},
    {loc:2,size:3,type:0x1401,normalized:true,data:pack(mesh.colors)},
  ],indices:{type:0x1405,data:pack(mesh.indices)},
  uniforms:{uMvp:{type:'Matrix4fv',value:mvp},uExpand:{type:'1f',value:shell?.031:0},uMode:{type:'1i',value:glow?2:shell?1:0}},
  state:{viewport:[0,0,w,h],depthTest:true,depthFunc:0x0203,cullFaceEnabled:!glow,
    cullFace:shell?0x0404:0x0405,frontFace:0x0901,blend:false,depthMask:true},
};}
const trace={width:w,height:h,clear:{color:[.94,.94,.918,1]},view:mode,stats:meshes.stats,
  draws:[...(outline==='on'?[draw(meshes.opaque,true)]:[]),draw(meshes.opaque),draw(meshes.glow,false,true)]};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(trace));
console.log(JSON.stringify({view:mode,draws:trace.draws.length,triangles:meshes.stats.triangles,vertices:meshes.stats.vertices,trace:out}));
