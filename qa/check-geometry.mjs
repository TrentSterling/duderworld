import {buildWorld,DEFAULT_RECIPE} from '../src/world.mjs';
import {strict as assert} from 'node:assert';

function check(config){
  const world=buildWorld(config);let triangles=0,reversed=0,minArea=Infinity;
  for(const mesh of [world.opaque,world.glow]){
    const {positions:p,normals:n,colors:c,indices:id}=mesh;
    assert.equal(p.length,n.length);assert.equal(p.length,c.length);
    assert.equal(id.length%3,0);triangles+=id.length/3;
    for(let i=0;i<p.length;i++)assert.ok(Number.isFinite(p[i])&&Number.isFinite(n[i]));
    for(let i=0;i<id.length;i+=3){
      const a=id[i]*3,b=id[i+1]*3,d=id[i+2]*3;
      assert.ok(a>=0&&d<p.length&&b<p.length);
      const ab=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],ac=[p[d]-p[a],p[d+1]-p[a+1],p[d+2]-p[a+2]];
      const face=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],area=Math.hypot(...face);
      assert.ok(area>1e-8,'Degenerate triangle');minArea=Math.min(minArea,area);
      const dot=face.reduce((s,f,k)=>s+f*(n[a+k]+n[b+k]+n[d+k]),0);
      if(dot<-.01*area)reversed++;
    }
  }
  assert.equal(reversed,0,'Reversed triangles');assert.equal(triangles,world.stats.triangles);
  assert.equal(world.stats.staticDraws,2);
  return {vertices:world.stats.vertices,triangles,minArea};
}

const cases=[];
for(const width of [26,32,42])for(const depth of [20,24,34])for(const facets of [12,24,40]){
  const recipe={...DEFAULT_RECIPE,width,depth,facets};
  const one=check(recipe),two=buildWorld(recipe);
  assert.equal(one.triangles,two.stats.triangles);
  cases.push(one);
}
let changedSeed=buildWorld({seed:41});
assert.notDeepEqual(Array.from(changedSeed.opaque.positions),Array.from(buildWorld({seed:42}).opaque.positions));
const sameA=buildWorld({seed:8192}),sameB=buildWorld({seed:8192});
assert.deepEqual(sameA.opaque.positions,sameB.opaque.positions);
const report={pass:true,recipes:cases.length,totalTriangles:cases.reduce((s,c)=>s+c.triangles,0),
  default:check(DEFAULT_RECIPE),minArea:Math.min(...cases.map(c=>c.minArea)),trianglesMax:Math.max(...cases.map(c=>c.triangles)),
  checks:['finite positions and normals','valid indices','nondegenerate and consistently oriented triangles','repeated deterministic recipes','seed variation','two rendering buckets']};
console.log(JSON.stringify(report,null,2));
