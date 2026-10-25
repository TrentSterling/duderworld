// Real geometry inspection scene, separate from the runnable world.
import * as THREE from 'three';
import {MeshBucket,planter as oldPlant} from '../src/world.mjs';
import {ceramicPlanter,islandPalm} from '../src/botanical-kit.mjs';
import {createNPRMaterial} from '../src/npr-material.mjs';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1600,1000);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.style.margin='0';document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e4ded0');
scene.add(new THREE.HemisphereLight(0xfff1dc,0x8c91b8,1.45));
const sun=new THREE.DirectionalLight(0xfff0d8,1.72);sun.position.set(-4,9,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});sun.shadow.bias=-.00012;sun.shadow.normalBias=.018;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),createNPRMaterial());floor.material.vertexColors=false;floor.material.color.set('#e4ded0');floor.rotation.x=-Math.PI/2;floor.position.y=-.01;floor.receiveShadow=true;scene.add(floor);
const params=new URLSearchParams(location.search),legacy=params.get('variant')==='before';
const b=new MeshBucket('botanical study');
if(legacy){oldPlant(b,-1.8,0,1.2,417);oldPlant(b,0,0,.9,92);oldPlant(b,1.7,0,1.05,83);}
else{ceramicPlanter(b,-1.8,0,1.2,417,{hero:true});ceramicPlanter(b,0,0,.9,92,{potColor:[195,171,179]});ceramicPlanter(b,1.7,0,1.05,83,{hero:true,potColor:[172,194,176]});}
const d=b.output(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(d.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(d.normals,3));
const colors=new Float32Array(d.colors.length);for(let i=0;i<colors.length;i++){const c=d.colors[i]/255;colors[i]=c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.setIndex(new THREE.BufferAttribute(d.indices,1));
const mat=legacy?new THREE.MeshStandardMaterial({vertexColors:true,roughness:.79}):createNPRMaterial();
const obj=new THREE.Mesh(g,mat);obj.castShadow=true;obj.receiveShadow=true;scene.add(obj);
const camera=new THREE.PerspectiveCamera(35,1.6,.1,100);camera.position.set(4.1,3.7,8.2);camera.lookAt(0,1.05,0);
renderer.render(scene,camera);window.__botanical={renderer,scene,camera,stats:{triangles:d.indices.length/3,vertices:d.positions.length/3}};
requestAnimationFrame(()=>renderer.render(scene,camera));
