// ARCHIPEL 0.5: large organic island field, connected maritime mesh with
// 2-4 routes per island. Pure and independently testable (no Three.js dependency).
const MIN_DISTANCE=5.05;
const FALLBACK=[
 [-5.4,-15.7],[1.3,-16.4],[6.1,-11.3],[-2.8,-9.5],[3.6,-5.2],
 [-5.9,-2.7],[1.2,.9],[6.4,4.8],[-4.7,10.1],[2.3,16.0]
];
export function generatePositions(rng=Math.random){
 const result=[];
 for(let k=0;k<18000&&result.length<10;k++){
  const theta=rng()*Math.PI*2,r=Math.sqrt(rng());
  const x=7.4*r*Math.cos(theta),z=17.8*r*Math.sin(theta);
  if(result.every(p=>Math.hypot(p[0]-x,p[1]-z)>=MIN_DISTANCE))result.push([x,z]);
 }
 if(result.length===10)return result;
 // Rare sampler fallback, slight global rotation to avoid a fixed visual grid.
 const angle=(rng()-.5)*.22,c=Math.cos(angle),s=Math.sin(angle);
 return FALLBACK.map(([x,z])=>[x*c-z*s,x*s+z*c]);
}
export function generateSeaLanes(tiles){
 const n=tiles.length,all=[];
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
  all.push({i,j,d:Math.hypot(tiles[i].x-tiles[j].x,tiles[i].z-tiles[j].z)});
 all.sort((a,b)=>a.d-b.d);
 const edges=[],inTree=new Set([0]);
 const has=(i,j)=>edges.some(e=>e[0]===i&&e[1]===j||e[0]===j&&e[1]===i);
 const degree=i=>edges.reduce((a,e)=>a+(e[0]===i||e[1]===i?1:0),0);
 function crosses(a,b){
  if(a.i===b[0]||a.i===b[1]||a.j===b[0]||a.j===b[1])return false;
  const A=tiles[a.i],B=tiles[a.j],C=tiles[b[0]],D=tiles[b[1]];
  const cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
  return cross(A,B,C)*cross(A,B,D)<0&&cross(C,D,A)*cross(C,D,B)<0;
 }
 // Connected graph, using shortest bridges first.
 while(inTree.size<n){
  const best=all.find(a=>inTree.has(a.i)!==inTree.has(a.j));
  if(!best)throw Error("Unable to connect islands");
  edges.push([best.i,best.j]);inTree.add(best.i);inTree.add(best.j);
 }
 // Guarantee two distinct neighbors. Avoid intersections where possible.
 for(const minimum of [2,3]){
  for(const strict of [true,false]){
   for(let i=0;i<n;i++){
    while(degree(i)<minimum){
     const pick=all.find(e=>(e.i===i||e.j===i)&&!has(e.i,e.j)
       &&degree(e.i)<4&&degree(e.j)<4
       &&(!strict||edges.every(b=>!crosses(e,b))));
     if(!pick)break;
     edges.push([pick.i,pick.j]);
    }
   }
  }
 }
 // More strategic options, without the spaghetti of twenty crossing lines.
 for(const strict of [true,false]){
  for(const edge of all){
   if(edges.length>=17)break;
   if(has(edge.i,edge.j)||degree(edge.i)>=4||degree(edge.j)>=4)continue;
   if(strict&&edges.some(b=>crosses(edge,b)))continue;
   edges.push([edge.i,edge.j]);
  }
 }
 // Normally all islands have 3 or 4. Never create degree-one islands.
 for(let i=0;i<n;i++)if(degree(i)<2)throw Error("Maritime graph contains a dead-end island");
 return edges;
}
export {MIN_DISTANCE};
