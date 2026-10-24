// Bundle the dependency-free V0.4 authoring studio into one offline file:// HTML.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const graph=readFileSync(join(root,'src/layout-graph.mjs'),'utf8')
  .replace(/\bexport\s+(?=(?:function|const|class)\b)/g,'');
const studio=readFileSync(join(root,'src/studio-v0-4.js'),'utf8').replaceAll('</script','<\\/script');
const template=readFileSync(join(root,'src/studio-v0-4-template.html'),'utf8');
const code='const {generateLayoutGraph,validateLayoutGraph}=(()=>{\n'+graph+
  '\nreturn {generateLayoutGraph,validateLayoutGraph};\n})();\n'+studio;
const html=template.replace('/* BUNDLED_GENERATOR_AND_STUDIO */',()=>code);
writeFileSync(join(root,'static.html'),html,'utf8');
console.log('Built static.html',Buffer.byteLength(html),'bytes');
