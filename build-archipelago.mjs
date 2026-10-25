// Produces one offline file:// HTML with Three.js, controls and GLTFExporter.
import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url));
const result=await build({entryPoints:[join(root,'src/archipelago-viewer.js')],
  bundle:true,format:'iife',platform:'browser',target:'es2020',
  minify:true,sourcemap:false,write:false,legalComments:'inline'});
if(result.outputFiles.length!==1)throw new Error('Expected one bundled JS file');
const script=result.outputFiles[0].text.replaceAll('</script','<\\/script');
const template=readFileSync(join(root,'src/archipelago-template.html'),'utf8');
const license=readFileSync(join(root,'node_modules/three/LICENSE'),'utf8');
const html=template.replace('/* INLINE_GENERATED_CODE */',()=>script)
  .replace('<!doctype html>','<!doctype html>\n<!--\n'+license+'\n-->');
const path=join(root,'duderworld-v0-5-0.html');
writeFileSync(path,html,'utf8');
console.log('Created',path,'bytes',Buffer.byteLength(html),'sha256',
  createHash('sha256').update(html).digest('hex'));
