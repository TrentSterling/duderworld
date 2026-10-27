// DuderWorld Coast: shared opaque palette, indexed batches and modeling helpers.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const COLORS = Object.freeze({
  ivory:'#fff0d6', cream:'#f1ddba', porcelain:'#fff9e9', stone:'#b5a596',
  stoneDark:'#7c818e', stoneLight:'#d5bda3', coral:'#f07b69', salmon:'#f4a28c',
  peach:'#efc2a1', gold:'#ffc456', yellow:'#ffe48b', blue:'#449bdd',
  sky:'#8ecbdf', aqua:'#53c8c6', teal:'#298e99', ink:'#284758',
  lilac:'#b497dc', violet:'#8c67bd', mint:'#b8dca0', grass:'#8fbf68',
  leaf:'#5c9b55', leafLight:'#a5cb63', leafDark:'#397459', sand:'#e9ce9a',
  sandLight:'#f3dfb3', wood:'#ba8857', woodDark:'#865e45', orange:'#ed9950',
  sea:'#429fb7', seaLight:'#62b6c4', foam:'#bce2dd', pink:'#e88db1',
  red:'#df5a62', navy:'#3f6591', black:'#273239', white:'#fff9ef',
  waterDeep:'#398ba6', portalBlue:'#40bedc', portalGold:'#ffd96d', portalPink:'#c79ae5'
});
export const PALETTE_KEYS = Object.keys(COLORS);
const palette = new Map(PALETTE_KEYS.map((k,i)=>[k,i]));
export const ATLAS_SIZE = 128;

// The tiny RGB atlas exports through stock glTF PBR materials, no shader required.
// Swatches have wide gutters. UVs stay near their center, safely within mip 0.
export function createPaletteCanvas(){
  const c=document.createElement('canvas'); c.width=c.height=ATLAS_SIZE;
  const ctx=c.getContext('2d');
  ctx.fillStyle=COLORS.ivory; ctx.fillRect(0,0,128,128);
  for(let i=0;i<PALETTE_KEYS.length;i++){
    const h=COLORS[PALETTE_KEYS[i]].slice(1),rgb=[0,2,4].map(x=>parseInt(h.slice(x,x+2),16));
    for(let j=0;j<16;j++){
      const a=.85+.15*(1-j/15);
      ctx.fillStyle=`rgb(${rgb.map(v=>Math.round(v*a)).join(',')})`;
      ctx.fillRect((i%8)*16,Math.floor(i/8)*16+j,16,1);
    }
  }
  return c;
}
export function makeMaterials(){
  const tex=new THREE.CanvasTexture(createPaletteCanvas());
  tex.name='DuderWorld_Palette_128'; tex.colorSpace=THREE.SRGBColorSpace;
  tex.generateMipmaps=false; tex.minFilter=tex.magFilter=THREE.LinearFilter;
  const matte=new THREE.MeshStandardMaterial({map:tex,roughness:.94,metalness:0});
  matte.name='DuderWorld_Matte_Atlas';
  const hero=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,
    emissiveIntensity:.24,roughness:.82,metalness:0});
  hero.name='DuderWorld_Hero_Atlas';
  return {matte,hero,tex};
}
const matrix=new THREE.Matrix4(), normalMatrix=new THREE.Matrix3();
const pos=new THREE.Vector3(), normal=new THREE.Vector3(), q=new THREE.Quaternion();
const euler=new THREE.Euler(), scaleV=new THREE.Vector3();
function bucket(){return {p:[],n:[],uv:[],parts:[]};}

export class Batch {
  constructor(name){this.name=name;this.matte=bucket();this.hero=bucket();}
  add(geometry,color,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1],hero=false,label='geometry'){
    const slot=palette.get(color); if(slot===undefined)throw Error(`Unknown palette color ${color}`);
    geometry.computeBoundingBox();
    const lo=geometry.boundingBox.min.y,dy=Math.max(.001,geometry.boundingBox.max.y-lo);
    matrix.compose(pos.fromArray(position),q.setFromEuler(euler.fromArray(rotation)),scaleV.fromArray(scale));
    normalMatrix.getNormalMatrix(matrix);
    const dst=hero?this.hero:this.matte, p=geometry.attributes.position,n=geometry.attributes.normal;
    if(!n)geometry.computeVertexNormals();
    const normals=geometry.attributes.normal,index=geometry.index;
    const count=index?index.count:p.count, start=dst.p.length/3;
    for(let j=0;j<count;j+=3){
      const ids=[0,1,2].map(k=>index?index.getX(j+k):j+k);
      const a=new THREE.Vector3().fromBufferAttribute(p,ids[0]);
      const b=new THREE.Vector3().fromBufferAttribute(p,ids[1]);
      const c=new THREE.Vector3().fromBufferAttribute(p,ids[2]);
      if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-17)continue;
      for(const k of ids){
        const height=geometry.getAttribute('paletteHeight');
        const h=THREE.MathUtils.clamp(height?height.getX(k):(p.getY(k)-lo)/dy,0,1);
        pos.fromBufferAttribute(p,k).applyMatrix4(matrix);
        normal.fromBufferAttribute(normals,k).applyMatrix3(normalMatrix).normalize();
        dst.p.push(pos.x,pos.y,pos.z);dst.n.push(normal.x,normal.y,normal.z);
        dst.uv.push((slot%8+.5)/8,1-(Math.floor(slot/8)+.72-h*.44)/8);
      }
    }
    dst.parts.push({name:label,indexStart:start,indexCount:dst.p.length/3-start});
    geometry.dispose();return this;
  }
  finish(materials){
    const root=new THREE.Group();root.name=this.name;
    for(const kind of ['matte','hero']){
      const b=this[kind];if(!b.p.length)continue;
      const raw=new THREE.BufferGeometry();
      raw.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
      raw.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
      raw.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));
      const g=mergeVertices(raw,1e-5);raw.dispose();g.computeBoundingBox();g.computeBoundingSphere();
      const mesh=new THREE.Mesh(g,materials[kind]);mesh.name=this.name+'.'+kind;
      mesh.castShadow=mesh.receiveShadow=true;
      // Index ranges remain valid because welding preserves triangle order.
      mesh.userData={zone:this.name,parts:b.parts,materialClass:kind};root.add(mesh);
    }
    return root;
  }
}
export function geometry(p,i){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.flat(),3));
  if(i)g.setIndex(i.flat());g.computeVertexNormals();return g;
}
export function box(b,p,s,c='ivory',r=.08,yaw=0,rx=0,hero=false){
  b.add(new RoundedBoxGeometry(...s,2,Math.min(r,Math.min(...s)*.44)),c,p,[rx,yaw,0],[1,1,1],hero,'rounded block');
}
export function ellipsoid(b,p,s,c='leaf',rot=[0,0,0],segments=12){
  b.add(new THREE.SphereGeometry(1,segments,8),c,p,rot,s,false,'ellipsoid');
}
export function cylinder(b,p,r,h,c='ivory',rt=r,n=20,hero=false){
  b.add(new THREE.CylinderGeometry(rt,r,h,n,1),c,[p[0],p[1]+h/2,p[2]],[0,0,0],[1,1,1],hero,'turned profile');
}
export function tube(b,points,r,c='ivory',hero=false,closed=false){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal');
  b.add(new THREE.TubeGeometry(curve,Math.max(6,points.length*3),r,8,closed),c,[0,0,0],[0,0,0],[1,1,1],hero,'solid swept rail');
}
export function bar(b,a,z,r,c='ivory'){
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...z),len=av.distanceTo(bv);
  const g=new THREE.CylinderGeometry(r,r,len,8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize()));
  b.add(g,c,av.add(new THREE.Vector3(...z)).multiplyScalar(.5).toArray(),[0,0,0],[1,1,1],false,'structural bar');
}
export function slab(b,points,holes,y,h,c='ivory',bevel=.04){
  const s=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));
  for(const hole of holes||[])s.holes.push(new THREE.Path(hole.map(([x,z])=>new THREE.Vector2(x,-z))));
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:24});
  g.rotateX(-Math.PI/2);b.add(g,c,[0,y-h,0],[0,0,0],[1,1,1],false,'solid shaped slab');
}
export function ellipsePoints(x,z,rx,rz,n=64){return Array.from({length:n},(_,i)=>[x+rx*Math.cos(i*TAU/n),z+rz*Math.sin(i*TAU/n)]);}
export function arcBlock(b,x,z,r0,r1,y,h,a0,a1,c='ivory'){
  const n=Math.max(3,Math.ceil((a1-a0)*12)),pts=[];
  for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push([x+r1*Math.cos(a),z+r1*Math.sin(a)]);}
  for(let i=n;i>=0;i--){const a=a0+(a1-a0)*i/n;pts.push([x+r0*Math.cos(a),z+r0*Math.sin(a)]);}
  slab(b,pts,[],y+h,h,c,Math.min(.035,h*.2));
}
export function floorTile(b,x,z,r0,r1,y,a0,a1,c){
  const n=Math.max(2,Math.ceil((a1-a0)*18)),v=[],ind=[];
  for(let i=0;i<=n;i++)for(const r of [r0,r1]){const a=a0+(a1-a0)*i/n;v.push([x+r*Math.cos(a),y,z+r*Math.sin(a)]);}
  for(let i=0;i<n;i++){const j=i*2;ind.push(j,j+3,j+1,j,j+2,j+3);}
  b.add(geometry(v,ind),c,[0,0,0],[0,0,0],[1,1,1],false,'paving inlay');
}
export function roundedArch(b,x,y,z,w,h,depth,color,thickness=.25,hero=false){
  const radius=w/2,shoulder=h-radius;
  const outer=new THREE.Shape();outer.moveTo(-radius,0);outer.lineTo(radius,0);outer.lineTo(radius,shoulder);
  outer.absarc(0,shoulder,radius,0,Math.PI,false);outer.lineTo(-radius,0);
  if(thickness>0){
    const ri=radius-thickness,inner=new THREE.Path();inner.moveTo(-ri,0);inner.lineTo(-ri,shoulder);
    inner.absarc(0,shoulder,ri,Math.PI,0,true);inner.lineTo(ri,0);inner.closePath();outer.holes.push(inner);
  }
  const g=new THREE.ExtrudeGeometry(outer,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.07,curveSegments:24});
  b.add(g,color,[x,y,z-depth/2],[0,0,0],[1,1,1],hero,'recessed arch');
}
export function seeded(seed){let a=seed|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
