import assert from 'node:assert/strict';
import {generateLayoutGraph,validateLayoutGraph} from '../src/layout-graph.mjs';
let count=0;
for(const n of [3,4,5,6,7,8,9,10,11,12])
for(const topology of ['radial','ring','chain','hybrid'])
for(const spread of [.9,1,1.35])
for(const variation of [0,.75,1]){
  const settings={islandCount:n,topology,spread,variation,seed:93725};
  const a=generateLayoutGraph(settings),b=generateLayoutGraph(settings);
  assert.deepEqual(a,b,'non-deterministic recipe');
  assert.equal(a.nodes.length,n);
  const v=validateLayoutGraph(a);
  assert(v.ok,v.errors.join('; '));count++;
}
const v03=generateLayoutGraph();
assert.equal(v03.nodes.length,7);assert.equal(v03.edges.length,6);
assert.equal(v03.nodes[1].x,-43);assert.equal(v03.nodes[5].z,48);
console.log(JSON.stringify({pass:true,checks:count,baselineIslands:7,baselineBridges:6}));
