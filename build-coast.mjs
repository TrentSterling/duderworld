// Self-contained offline preview; does not overwrite any preserved version.
import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url));
const result=await build({entryPoints:[join(root,'src/coast-viewer.js')],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,write:false,legalComments:'inline'});
const script=result.outputFiles[0].text.replaceAll('</script','<\\/script');
const template=readFileSync(join(root,'src/coast-template.html'),'utf8');
const license=readFileSync(join(root,'node_modules/three/LICENSE'),'utf8');
const html=template.replace('/* INLINE_GENERATED_CODE */',()=>script).replace('<!doctype html>','<!doctype html>\n<!--\n'+license+'\n-->');
const path=join(root,'duderworld-coast-v0-5.html');writeFileSync(path,html,'utf8');
console.log(JSON.stringify({file:path,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex')},null,2));
