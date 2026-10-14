// ARCHIPEL 0.4 — organic coastline geometry & individually detailed toy dioramas.
const pi=Math.PI;
const matte=(T,color,roughness=.82)=>new T.MeshStandardMaterial({color,roughness,flatShading:false});
function add(parent,T,geo,material,x=0,y=0,z=0){
 const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
function pebble(parent,T,mat,x,y,z,sx,sy,sz){
 const p=add(parent,T,new T.IcosahedronGeometry(1,1),mat,x,y,z);
 p.scale.set(sx,sy,sz);return p;
}
function stalk(parent,T,mat,x,y,z,r,h,n=8){
 return add(parent,T,new T.CylinderGeometry(r*.74,r,h,n),mat,x,y,z);
}
function terrace(group,T,material,radius,heightTop,heightBottom,seed,ripple=0){
 const n=32,vertices=[],index=[],norm=[];
 const radiusAt=i=>radius*(1+.065*Math.sin(i*.93+seed*3.17)+.047*Math.sin(i*2.19+seed*.57)+.025*Math.sin(i*3.3+seed*1.31));
 for(const y of [heightTop,heightBottom]){
  for(let i=0;i<n;i++){
   const a=i*2*pi/n,rv=radiusAt(i)*(y===heightBottom?.94:1);
   vertices.push(Math.cos(a)*rv,y+Math.sin(a*5+seed)*ripple,Math.sin(a)*rv);
  }
 }
 vertices.push(0,heightTop+.008,0);
 for(let i=0;i<n;i++){
  const k=(i+1)%n;
  // Counter-clockwise winding outward and upward for Three.js front faces.
  index.push(i,k,n+i,k,n+k,n+i);
  index.push(n*2,k,i);
 }
 const g=new T.BufferGeometry();
 g.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
 g.setIndex(index);g.computeVertexNormals();
 const m=add(group,T,g,material);
 m.castShadow=true;return m;
}
function landmark(parent,t,T,M){
 const g=new T.Group();parent.add(g);
 // Keep the landmark away from village buildings while still standing out on empty islands.
 g.position.set(t.owner===null?0:.58,0,t.owner===null?-.07:-.51);
 g.scale.setScalar(t.owner===null?1:.62);
 const pearl=matte(T,0xfff3db,.43),stone=matte(T,0xcdbd9f),
   cyan=matte(T,0x61dce7,.24),flower=matte(T,0xef9fba),
   turquoise=matte(T,0x3db6ba,.28),leaf=matte(T,0x489e6e),
   amber=matte(T,0xe8b76a),charcoal=matte(T,0x6e7370);
 if(t.theme==="coast"){
  pebble(g,T,pearl,.0,.95,0,.33,.17,.25);
  for(let i=0;i<5;i++){
   const a=i*2*Math.PI/5;
   pebble(g,T,pearl,Math.cos(a)*.23,.91,Math.sin(a)*.22,.14,.09,.09);
  }
  pebble(g,T,M.gold,0,1.18,0,.10,.11,.09);
 }else if(t.theme==="waterfall"){
  pebble(g,T,stone,-.10,1.02,-.10,.37,.39,.34);
  pebble(g,T,leaf,-.08,1.36,-.11,.30,.10,.29);
  for(let j=0;j<3;j++)add(g,T,new T.BoxGeometry(.10,.57,.045),cyan,-.28+j*.16,.86,.19);
  pebble(g,T,turquoise,-.08,.73,.35,.36,.055,.20);
 }else if(t.theme==="flower"){
  stalk(g,T,M.wood,.02,1.07,.01,.070,.60,8);
  for(let j=0;j<7;j++){
   const a=j*2*Math.PI/7;
   pebble(g,T,flower,Math.cos(a)*.23,1.45+.04*Math.sin(a),Math.sin(a)*.23,.17,.12,.15);
  }
  pebble(g,T,M.gold,0,1.51,0,.14,.13,.12);
 }else if(t.theme==="coral"){
  // Translucent lagoon dish, pastel coral fans.
  pebble(g,T,turquoise,0,.80,.03,.39,.065,.36);
  for(let j=0;j<6;j++){
   const a=j*2*Math.PI/6;
   stalk(g,T,j%2?flower:amber,Math.cos(a)*.35,.87,Math.sin(a)*.32,.062,.24,7);
   pebble(g,T,j%2?flower:pearl,Math.cos(a)*.35,1.01,Math.sin(a)*.32,.13,.085,.12);
  }
 }else if(t.theme==="ruins"){
  for(const x of [-.29,0,.29]){
   stalk(g,T,stone,x,1.03,-.08,.09,.53,9);
   pebble(g,T,pearl,x,1.31,-.08,.13,.055,.12);
  }
  add(g,T,new T.BoxGeometry(.96,.15,.30),stone,0,1.39,-.08);
  pebble(g,T,M.gold,.02,1.52,-.08,.11,.05,.09);
 }else if(t.theme==="cliff"){
  pebble(g,T,amber,-.19,1.05,0,.24,.42,.32);
  pebble(g,T,stone,.20,1.07,-.08,.21,.37,.30);
  pebble(g,T,amber,.10,1.41,0,.22,.09,.25);
 }else if(t.theme==="forest"){
  for(let i=0;i<3;i++){
   const a=i*2*Math.PI/3;
   const x=Math.cos(a)*.27,z=Math.sin(a)*.27;
   stalk(g,T,M.woodDark,x,1.01,z,.046,.38,8);
   pebble(g,T,i%2?M.tree:M.treeBright,x,1.34,z,.22,.24,.21);
  }
 }else if(t.theme==="volcano"){
  const m=add(g,T,new T.ConeGeometry(.43,.73,10),charcoal,0,1.12,0);
  pebble(g,T,M.roofRed,0,1.49,0,.17,.046,.17);
  pebble(g,T,M.coral,0,1.55,0,.09,.10,.09);
 }else if(t.theme==="arch"){
  for(const x of [-.26,.26]){
   stalk(g,T,stone,x,1.07,0,.115,.59,8);
   pebble(g,T,stone,x,1.42,0,.16,.09,.14);
  }
  add(g,T,new T.BoxGeometry(.77,.20,.23),stone,0,1.49,0);
  pebble(g,T,amber,0,1.62,0,.20,.045,.16);
 }else if(t.theme==="mist"){
  for(let i=0;i<5;i++){
   const a=i*1.256;
   const p=pebble(g,T,pearl,Math.cos(a)*.28,1.17+Math.sin(a*2)*.06,Math.sin(a)*.25,.25,.14,.20);
   p.castShadow=false;
  }
  pebble(g,T,turquoise,0,.81,0,.29,.06,.26);
 }
}
export function organicFoundation(parent,t,T,M){
 const g=new T.Group();parent.add(g);
 const mat={
  deep:matte(T,0x947e71),lower:matte(T,0xbda990),sand:matte(T,0xffdfa2),
  shell:matte(T,0xffedbd),grass:matte(T,t.theme==="volcano"?0x8eaa74:0x85c96c),
  turf:matte(T,0x8bce7a),soil:matte(T,0xbca47c)
 };
 const seed=t.id*3.7+1.13;
 // Three rounded layered rings replace the previous rigid stack of discs.
 terrace(g,T,mat.deep,1.02,.27,-.23,seed,.018);
 terrace(g,T,mat.lower,1.14,.42,.20,seed+.8,.022);
 terrace(g,T,mat.sand,1.25,.50,.37,seed+.3,.009);
 terrace(g,T,mat.shell,1.14,.555,.49,seed+.3,.015);
 terrace(g,T,mat.grass,.99,.64,.53,seed+1.1,.017);
 terrace(g,T,mat.turf,.81,.706,.638,seed+1.1,.013);
 // Small smooth beaches, sea shells, grass and rocky ledges make the island unique.
 const stone=matte(T,0xc5ae8a),stoneLight=matte(T,0xe0c99f),
       water=matte(T,0x53cdda,.25),pink=matte(T,0xef9eaa);
 for(let j=0;j<6;j++){
  const a=(j*2.39+seed),r=1.08;
  pebble(g,T,j%2?stone:stoneLight,Math.cos(a)*r,.51,Math.sin(a)*r,.10,.052,.08);
 }
 for(let j=0;j<4;j++){
  const a=j*1.3+.63+seed,r=.90;
  pebble(g,T,mat.grass,Math.cos(a)*r,.70,Math.sin(a)*r,.10,.031,.12);
 }
 // Signature coast details, all hand-placed on miniature bases.
 if(t.theme==="coast"){
  for(let j=0;j<5;j++){
   const a=1.2+j*.55;
   pebble(g,T,pink,Math.cos(a)*1.08,.57,Math.sin(a)*1.08,.052,.045,.07);
  }
 }else if(t.theme==="waterfall"){
  for(let j=0;j<3;j++){
   const m=add(g,T,new T.BoxGeometry(.11,.41,.065),water,.62+j*.12,.83,-.42);
   m.rotation.z=.14*(j-1);
  }
 }else if(t.theme==="flower"){
  for(let j=0;j<6;j++){
   const a=j*1.047+.3;
   pebble(g,T,j%2?pink:mat.shell,Math.cos(a)*.8,.79,Math.sin(a)*.8,.08,.034,.072);
  }
 }else if(t.theme==="coral"){
  for(let j=0;j<6;j++){
   const a=j*pi/3;
   const x=Math.cos(a)*1.12,z=Math.sin(a)*1.12;
   stalk(g,T,j%2?pink:mat.shell,x,.53,z,.033,.13,6);
   pebble(g,T,pink,x,.62,z,.075,.050,.074);
  }
 }else if(t.theme==="cliff"){
  pebble(g,T,stone,.68,.84,-.55,.32,.32,.29);
  pebble(g,T,stoneLight,.74,1.00,-.50,.28,.09,.23);
 }else if(t.theme==="volcano"){
  const dark=matte(T,0x777b77),ember=matte(T,0xf68f53,.45);
  pebble(g,T,dark,.65,.86,-.40,.37,.21,.35);
  pebble(g,T,ember,.64,1.08,-.41,.16,.04,.17);
 }
 landmark(g,t,T,M);
 return g;
}
// Distinctly modeled village / city / fortress elements with curved rooftops and battlements.
export function architectureDetail(parent,t,T,M){
 if(t.owner===null)return;
 const g=new T.Group();parent.add(g);
 const roof=matte(T,t.owner===0?0x9870c9:0xed9a55);
 const stone=matte(T,0xf3e1be),timber=matte(T,0x8d6245),gold=matte(T,0xecc36a,.5);
 const home=(x,z,size)=>{
   const m=add(g,T,new T.CylinderGeometry(.20,.22,.26,8),stone,x,.86,z);m.scale.set(size,size,size);
   const r=add(g,T,new T.ConeGeometry(.31*size,.25*size,8),roof,x,1.12*size,z);
   add(g,T,new T.BoxGeometry(.065*size,.15*size,.07*size),timber,x,.80,z+.19*size);
   pebble(g,T,gold,x+.09,1.0*size,z+.19*size,.037,.034,.027);
 };
 home(-.35,-.25,.78);
 if(t.level>=1){
  home(.34,-.11,.86);home(-.18,.48,.73);
  // Village marketplace
  const market=add(g,T,new T.ConeGeometry(.20,.16,4),roof,.33,1.15,.42);
  market.rotation.y=pi/4;
  for(let j=0;j<4;j++){
   const a=j*pi/2;
   stalk(g,T,timber,.33+Math.cos(a)*.17,.96,.42+Math.sin(a)*.17,.018,.28);
  }
 }
 if(t.level>=2){
  for(const a of [-1,1]){
   const fort=add(g,T,new T.CylinderGeometry(.16,.19,.64,9),stone,a*.67,1.01,.54);
   add(g,T,new T.ConeGeometry(.25,.27,9),roof,a*.67,1.47,.54);
   for(let i=0;i<4;i++)add(g,T,new T.BoxGeometry(.095,.11,.13),stone,a*.67+(i-1.5)*.10,1.24,-.59);
  }
 }
}
// Toy naval detailing is visible even on an iPhone: graceful curved gunwale,
// long pennant, contrasting hull plank lines, lanterns and different rigging.
export function shipDetail(parent,player,level,T,M){
 const g=new T.Group();parent.add(g);
 const color=player===0?0x9a77d3:0xf3a04c;
 const accent=matte(T,color,.65),satin=matte(T,player===0?0xd6c8f0:0xffdca1,.56),
       timber=matte(T,0xc18c5b),dark=matte(T,0x75523a),gold=matte(T,0xf2cb74,.28);
 const point=(a,b,r,mat)=>{
  const vecA=new T.Vector3(...a),vecB=new T.Vector3(...b);
  const axis=vecB.clone().sub(vecA);const p=add(g,T,new T.CylinderGeometry(r,r,axis.length(),7),mat);
  p.position.copy(vecA.add(vecB).multiplyScalar(.5));
  p.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());
 };
 // Smooth curved naval railing around the bow and stern.
 for(const side of [-1,1]){
  for(let j=0;j<6;j++){
   const z=-.55+j*.21,xx=side*(.29-.08*Math.abs(z));
   pebble(g,T,j%2?timber:dark,xx,.46,z,.045,.040,.16);
  }
  point([side*.28,.64,.42],[side*.30,.61,-.31],.012,gold);
 }
 // Lanterns and mast-head flag
 for(let j=0;j<2;j++)pebble(g,T,gold,(j?1:-1)*.22,.66,.49,.05,.09,.05);
 // Small rigging lines, sail stitching and crossbars.
 point([0,1.48,-.1],[-.40,.43,-.38],.010,timber);
 point([0,1.48,-.1],[.39,.43,.43],.010,timber);
 point([-.28,1.08,-.13],[.22,1.08,-.13],.013,satin);
 for(let j=0;j<3;j++){
  const y=.74+j*.19;
  point([-.25,y,-.145],[.18,y,-.145],.007,satin);
 }
 if(level>=2){
  pebble(g,T,accent,.16,1.43,.34,.07,.11,.075);
  point([.11,1.39,.39],[.39,.46,.54],.009,timber);
 }
 if(level===3){
  const gallery=add(g,T,new T.BoxGeometry(.55,.11,.34),dark,0,.62,.61);
  for(let j=0;j<4;j++)pebble(g,T,gold,(j-1.5)*.14,.7,.76,.038,.045,.035);
  point([0,1.58,-.52],[-.38,.41,-.58],.009,timber);
  point([0,1.58,-.52],[.36,.41,-.35],.009,timber);
 }
 // Iconic faction crest at the aft.
 pebble(g,T,accent,0,.50,.70,.14,.08,.15);
 pebble(g,T,satin,0,.52,.80,.06,.045,.05);
}
