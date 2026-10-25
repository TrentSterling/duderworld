// Closed rounded box used by the current world. V0.2's historical utility is
// retained separately for old recipe reproducibility. Every axis appears once.
export function roundedBox(b,center,size,r,color,div=5){
 const h=size.map(v=>v*.5),radius=Math.min(r,...h.map(x=>x*.95));
 const axes=[[0,1,2],[1,0,2],[2,0,1]];
 // Sample the bend deliberately instead of spending subdivisions on the flat.
 const samples=half=>{
  // Tiny trim gets one bevel station (two chords across the full corner).
  // At a 5 cm radius this bounds the silhouette error to about 3.8 mm.
  // Upholstery and all broader bends retain their previous samples.
  const core=half-radius,steps=radius<=.05?1:Math.max(2,Math.min(4,Math.floor(div/2))),a=[];
  for(let i=0;i<=steps;i++)a.push(-core-radius*Math.cos(i/steps*Math.PI/2));
  for(let i=0;i<=steps;i++)a.push(core+radius*Math.sin(i/steps*Math.PI/2));
  return a.filter((v,i)=>i===0||Math.abs(v-a[i-1])>1e-8);
 };
 for(const [axis,ua,va] of axes)for(const side of [-1,1]){
  const us=samples(h[ua]),vs=samples(h[va]),grid=[];
  for(const q of vs){const row=[];
   for(const s of us){
    const p=[0,0,0];p[axis]=side*h[axis];p[ua]=s;p[va]=q;
    const core=p.map((x,i)=>Math.max(-h[i]+radius,Math.min(h[i]-radius,x)));
    const delta=p.map((x,i)=>x-core[i]),len=Math.hypot(...delta)||1,n=delta.map(x=>x/len);
    row.push({p:core.map((x,i)=>center[i]+x+n[i]*radius),n,c:color});
   }grid.push(row);
  }
  for(let j=0;j<vs.length-1;j++)for(let i=0;i<us.length-1;i++)b.quad(grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]);
 }
}
