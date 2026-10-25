import {readFileSync,writeFileSync} from 'node:fs';
import {buildArchipelago} from '../src/archipelago.mjs';
import {createWorldMetadata} from '../src/world-metadata.mjs';
// node qa/export-world-metadata-v0-4.mjs [recipe.json] [output.json]
const input=process.argv[2]?JSON.parse(readFileSync(process.argv[2],'utf8')):{};
const world=buildArchipelago(input.settings||input);
const out=JSON.stringify(createWorldMetadata(world),null,2)+'\n';
if(process.argv[3]){writeFileSync(process.argv[3],out);console.log('Wrote',process.argv[3]);}
else process.stdout.write(out);
