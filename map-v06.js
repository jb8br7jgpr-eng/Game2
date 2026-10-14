// ARCHIPEL V0.6 – distinct island shapes each game, with generous open water.
// Templates vary the *global geography*, not merely shuffled island names.
export const MIN_ISLAND_SPACING=6.6;
const pi=Math.PI;
const modes=["atoll","croissant","chapelet","constellation","deux-baies"];
const rotate=(x,z,a)=>[x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function candidate(mode,rng){
 const u=rng(),v=rng(),a=rng()*2*pi;
 if(mode==="atoll"){
  const theta=2*pi*u,r=15.0+v*5.0;
  return [Math.cos(theta)*r,Math.sin(theta)*r*.84];
 }
 if(mode==="croissant"){
  // Widely separated horns and a concave inner lagoon.
  const theta=(-.18+u*1.37)*pi;
  const r=14+v*6;
  return [Math.cos(theta)*r+1.3,Math.sin(theta)*r*1.07];
 }
 if(mode==="chapelet"){
  // A drifting chain that curves, with a few branches off to the sides.
  const z=(u-.5)*46;
  return [(Math.sin(z*.16)*5.4)+(v-.5)*12,z];
 }
 if(mode==="deux-baies"){
  // Two loose groups divided by a broad corridor of water.
  const left=u<.50;
  const r=Math.sqrt(v),ang=a;
  return [(left?-11:11)+Math.cos(ang)*r*9,(left?-8:8)+Math.sin(ang)*r*10];
 }
 // Natural, asymmetric constellation, slightly oval.
 return [Math.cos(a)*Math.sqrt(u)*20,Math.sin(a)*Math.sqrt(u)*21];
}
export function generatePositions(rng=Math.random){
 const mode=modes[Math.floor(rng()*modes.length)];
 const orientation=rng()*2*pi;
 const reflection=rng()<.5?-1:1;
 const points=[];
 for(let attempt=0;attempt<9000&&points.length<10;attempt++){
  const [x,z]=candidate(mode,rng);
  const pos=rotate(x*reflection,z,orientation);
  if(points.every(p=>distance(p,pos)>=MIN_ISLAND_SPACING))points.push(pos);
 }
 if(points.length<10){
  // Guaranteed connected-field fallback with continuously varying orientation.
  // Distances remain large; still differs between games.
  const offset=orientation;
  for(let i=0;points.length<10&&i<200;i++){
   const a=i*2.399963+offset,r=9.6+Math.sqrt(i)*4.6;
   const pt=rotate(Math.cos(a)*r,Math.sin(a)*r,orientation);
   if(points.every(p=>distance(p,pt)>=MIN_ISLAND_SPACING))points.push(pt);
  }
 }
 // Normalize camera framing and slightly recenter the land mass.
 const avg=points.reduce((a,b)=>[a[0]+b[0],a[1]+b[1]],[0,0]).map(v=>v/10);
 return points.map(([x,z])=>[Math.round((x-avg[0])*100)/100,Math.round((z-avg[1])*100)/100]);
}
export const ARCHIPEL_FORMS=modes;
