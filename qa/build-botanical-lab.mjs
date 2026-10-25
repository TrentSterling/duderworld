import {build} from 'esbuild';
import {writeFileSync,mkdirSync} from 'node:fs';
import {MeshBucket} from '../src/world.mjs';
import {ceramicPlanter,islandPalm} from '../src/botanical-kit.mjs';
const result=await build({entryPoints:['qa/botanical-lab.mjs'],bundle:true,format:'iife',minify:true,write:false});
mkdirSync('evidence/art',{recursive:true});
writeFileSync('evidence/art/botanical-lab.html','<!doctype html><meta charset="utf-8"><title>DuderWorld botanical mesh study</title><body><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
const objects=[];
for(let i=0;i<3;i++){
 const b=new MeshBucket('Ceramic plant '+i);ceramicPlanter(b,0,0,1,417+i,{hero:i!==1,potColor:[[239,211,181],[195,171,179],[172,194,176]][i]});
 const d=b.output();objects.push({name:b.name,position:[(i-1)*2.1,0,0],positions:Array.from(d.positions),normals:Array.from(d.normals),colors:Array.from(d.colors),indices:Array.from(d.indices)});
}
writeFileSync('evidence/art/botanical-meshes.json',JSON.stringify(objects));
