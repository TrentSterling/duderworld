// Bundle the complete Three.js viewer, controls and GLTFExporter for file://.
import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
const result=await build({entryPoints:[join(root,'src/main.js')],bundle:true,format:'iife',platform:'browser',
  target:'es2020',minify:true,sourcemap:false,write:false,legalComments:'inline'});
if(result.outputFiles.length!==1)throw Error('Bundler did not return exactly one script');
const js=result.outputFiles[0].text.replaceAll('</script','<\\/script');
const template=readFileSync(join(root,'src/template.html'),'utf8');
if(!template.includes('/* INLINE_GENERATED_CODE */'))throw Error('Missing template marker');
const threeLicense=readFileSync(join(root,'node_modules/three/LICENSE'),'utf8');
// Use a function replacement: Three.js source contains $& and $' sequences
// which String.replace would otherwise interpret as substitution tokens.
const html=template.replace('/* INLINE_GENERATED_CODE */',()=>js)
  .replace('<!doctype html>','<!doctype html>\n<!--\n'+threeLicense+'\n-->');
writeFileSync(join(root,'static.html'),html,'utf8');
console.log('DuderWorld V0.2 (Three.js):',Buffer.byteLength(html).toLocaleString(),'bytes; SHA256',createHash('sha256').update(html).digest('hex'));
