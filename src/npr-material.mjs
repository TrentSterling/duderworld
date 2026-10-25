// Original single-pass clay/gouache shading. Three.js supplies lights, shadow
// reception, instancing, fog and color management. No screen-space passes.
import * as THREE from 'three';
export function createNPRMaterial(){
 const material=new THREE.MeshToonMaterial({vertexColors:true});
 material.name='DuderWorld ceramic NPR';
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_toon_pars_fragment>',`
   varying vec3 vViewPosition;
   struct ToonMaterial { vec3 diffuseColor; };
   void RE_Direct_Toon(const in IncidentLight light,const in vec3 gp,const in vec3 n,const in vec3 viewDir,const in vec3 clearcoat,const in ToonMaterial m,inout ReflectedLight reflected){
    float ndl=dot(n,light.direction);
    float bands=.10+.40*smoothstep(-.12,.02,ndl)+.28*smoothstep(.48,.58,ndl);
    vec3 tint=mix(vec3(.76,.78,1.02),vec3(1.04,1.00,.87),smoothstep(.0,.62,ndl));
    reflected.directDiffuse+=m.diffuseColor*tint*light.color*bands*.48;
    vec3 h=normalize(light.direction+viewDir);
    float glint=smoothstep(.955,.985,dot(n,h))*.02*smoothstep(.25,.65,ndl);
    reflected.directDiffuse+=glint*light.color*vec3(1.,.94,.81);
   }
   void RE_IndirectDiffuse_Toon(const in vec3 irradiance,const in vec3 gp,const in vec3 n,const in vec3 viewDir,const in vec3 clearcoat,const in ToonMaterial m,inout ReflectedLight reflected){
    reflected.indirectDiffuse+=m.diffuseColor*irradiance*.28*vec3(.86,.86,1.04);
   }
   #define RE_Direct RE_Direct_Toon
   #define RE_IndirectDiffuse RE_IndirectDiffuse_Toon
  `);
 };
 material.customProgramCacheKey=()=> 'duderworld-npr-ceramic-1';
 return material;
}
