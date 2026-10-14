// ARCHIPEL v0.3 — richer, rounded toy-diorama geometry. Intentionally no heavy textures.
export function enhanceIsland(g,t,THREE,M){
 const group=new THREE.Group();g.add(group);
 const material=(col,rough=.88)=>new THREE.MeshStandardMaterial({color:col,roughness:rough,flatShading:false});
 const seaGlass=material(0x8de7dc,.44),lightSand=material(0xffe7b1),rockWarm=material(0xcdb78f),
 moss=material(0x7dc76d),jade=material(0x299a75),coconut=material(0xa77545),
 bark=material(0xa96f48),pink=material(0xf59aba),yellow=material(0xffd56b),
 foam=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.57,depthWrite:false}),
 lava=new THREE.MeshBasicMaterial({color:0xff8952}),watery=material(0x69d6e0,.22);
 const obj=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{
   const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);
   m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
 };
 const sphere=(x,y,z,rx,ry,rz,mat)=>obj(new THREE.SphereGeometry(1,12,8),mat,x,y,z,rx,ry,rz);
 const cylinder=(x,y,z,r1,r2,h,mat,n=12)=>obj(new THREE.CylinderGeometry(r1,r2,h,n),mat,x,y,z);
 const petals=(x,z,col=pink)=>{
   cylinder(x,.64,z,.028,.03,.17,jade,6);
   sphere(x,.76,z,.047,.04,.047,yellow);
   for(let j=0;j<5;j++){const a=j*2*Math.PI/5;sphere(x+Math.cos(a)*.085,.75,z+Math.sin(a)*.085,.073,.038,.065,col)}
 };
 const palms=(x,z,size=1)=>{
   const stem=cylinder(x,.92,z,.060*size,.078*size,.64*size,bark,8);
   stem.rotation.z=.12;
   const top=.92+.32*size;
   for(let j=0;j<7;j++){
    const a=(j/7)*Math.PI*2;
    const leaf=sphere(x+Math.cos(a)*.26*size,top-.05*size,z+Math.sin(a)*.26*size,.32*size,.055*size,.095*size,j%2?jade:moss);
    leaf.rotation.y=-a;
    leaf.rotation.z=Math.sin(a)*.21;
   }
   for(let j=0;j<3;j++)sphere(x+(j-1)*.062,top-.1,z+.02,.043,.051,.044,coconut)
 };
 const stones=(x,z,k=3)=>{
   for(let j=0;j<k;j++)sphere(x+Math.sin(j*3.7)*.19,.64+Math.random()*.02,z+Math.cos(j*4.4)*.16,
    .10+(j%2)*.04,.08,.12,j%2?M.stone:rockWarm)
 };
 // Rounded coast, asymmetrical islet lobes and playful tidal pools.
 sphere(-.68,.47,.24,.40,.065,.31,lightSand);
 sphere(.54,.47,.67,.35,.08,.23,lightSand);
 sphere(-.71,.50,-.05,.17,.06,.13,lightSand);
 sphere(.65,.44,-.60,.27,.06,.21,seaGlass);
 sphere(-.40,.47,.86,.23,.055,.16,seaGlass);
 stones(-.82,.38,2);
 if(t.theme==="coast"){
  palms(.72,-.46,.70);
  sphere(.76,.53,.19,.19,.056,.14,foam);
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2;
   sphere(.73+Math.cos(a)*.11,.58,.24+Math.sin(a)*.06,.033,.034,.044,M.pearl);
  }
 }else if(t.theme==="waterfall"){
  // Staggered stone plateau and twin cascading ribbons.
  sphere(.64,.83,-.52,.47,.31,.38,M.rock);
  sphere(.67,1.01,-.54,.35,.10,.30,moss);
  for(let j=0;j<2;j++){
   const x=.45+j*.23;
   const cascade=obj(new THREE.BoxGeometry(.13,.52,.04),watery,x,.70,-.12);
   cascade.rotation.z=(j-.5)*.17;
   sphere(x,.48,-.07,.14,.05,.17,seaGlass);
  }
  sphere(.50,.53,.04,.39,.06,.22,foam);
  palms(-.83,-.40,.62);
 }else if(t.theme==="flower"){
  sphere(.58,.65,-.48,.49,.13,.39,moss);
  for(let j=0;j<9;j++){const a=j*2.39;petals(Math.cos(a)*.73,.30+Math.sin(a)*.55,j%3===0?yellow:pink)}
  palms(-.67,-.51,.60);
 }else if(t.theme==="coral"){
  const shades=[M.coral,M.flower,yellow];
  for(let j=0;j<7;j++){
   const a=j*2*Math.PI/7;
   const x=Math.cos(a)*.97,z=Math.sin(a)*.82;
   cylinder(x,.49,z,.07,.10,.19,shades[j%3],6);
   sphere(x,.61,z,.13,.07,.12,shades[j%3]);
  }
  sphere(.59,.55,-.53,.20,.05,.20,watery);
 }else if(t.theme==="ruins"){
  for(const x of [-.72,-.33,.06]){
   cylinder(x,.83,-.47,.090,.108,.46,M.fortress,8);
   cylinder(x,1.07,-.47,.115,.115,.065,rockWarm,8);
  }
  obj(new THREE.BoxGeometry(1.02,.10,.25),M.fortress,-.32,1.13,-.47);
  petals(.67,.37);
 }else if(t.theme==="cliff"){
  sphere(.60,.70,-.42,.47,.23,.38,M.rock);
  sphere(.64,.92,-.41,.38,.11,.33,lightSand);
  sphere(.71,1.01,-.39,.31,.05,.24,moss);
  sphere(.85,.59,-.18,.20,.10,.16,rockWarm);
 }else if(t.theme==="forest"){
  for(let j=0;j<5;j++){
   const a=j*2*Math.PI/5;
   const x=Math.cos(a)*.71,z=Math.sin(a)*.68;
   cylinder(x,.87,z,.046,.061,.36,bark,7);
   sphere(x,1.13,z,.25,.29,.24,j%2?M.treeBright:M.tree);
   sphere(x-.11,1.24,z+.04,.16,.14,.18,moss);
  }
 }else if(t.theme==="volcano"){
  const mountain=obj(new THREE.CylinderGeometry(.21,.51,.73,11),M.volcanic,.65,.86,-.43);
  sphere(.65,1.28,-.43,.20,.055,.20,M.rock);
  sphere(.65,1.34,-.43,.145,.034,.145,lava);
  for(let i=0;i<4;i++){const a=i*1.57;sphere(.66+Math.cos(a)*.24,.99,-.43+Math.sin(a)*.23,.09,.04,.12,M.volcanic)}
 }else if(t.theme==="arch"){
  for(const x of [.38,.79]){
   cylinder(x,.83,-.47,.13,.14,.49,rockWarm,8);
   sphere(x,1.10,-.47,.16,.09,.14,M.stone);
  }
  obj(new THREE.BoxGeometry(.60,.17,.26),M.stone,.59,1.20,-.47);
  sphere(.59,1.32,-.47,.30,.095,.18,rockWarm);
 }else if(t.theme==="mist"){
  for(let i=0;i<4;i++){
   const a=i*1.39;const x=.45+Math.cos(a)*.21,z=-.51+Math.sin(a)*.25;
   const haze=sphere(x,.72,z,.22,.15,.19,foam);haze.castShadow=false;
  }
  palms(-.66,.47,.70);
 }
 if(t.owner!==null){
  // Extra custom touches let buildings look more like little hand-crafted toys.
  const faction=t.owner===0?M.purple:M.orange;
  // Entrance stone path and gold lanterns.
  for(let i=0;i<4;i++)sphere(-.08+i*.11,.64,.54+i*.13,.13,.018,.07,rockWarm);
  for(const x of [-.40,.40]){
   cylinder(x,.76,.76,.030,.038,.20,M.woodDark,7);
   sphere(x,.91,.76,.070,.079,.06,M.gold);
  }
  // Growth at level 1 creates a distinct proper town square and tiny fountain.
  if(t.level>=1){
   cylinder(.02,.71,.17,.17,.19,.09,rockWarm,10);
   sphere(.02,.80,.17,.10,.10,.10,watery);
   petals(-.73,.22,pink);
  }
  // At level 2 defense is obvious even when zoomed out.
  if(t.level>=2){
   for(const x of [-.68,.69]){
    cylinder(x,1.09,.64,.18,.19,.61,M.fortress,8);
    obj(new THREE.ConeGeometry(.24,.25,8),M.roofRed,x,1.51,.64);
   }
  }
  const flag=obj(new THREE.BoxGeometry(.31,.20,.035),faction,-.57,1.41,.13);
  flag.rotation.y=-.22;
 }
 group.userData.premiumDetails=true;
}
export function enhanceShip(g,player,level,THREE,M){
 const orange=player===1,flag=orange?M.orange:M.purple;
 const bright=new THREE.MeshStandardMaterial({color:orange?0xf8c278:0xc6b1ff,roughness:.52});
 const hull=new THREE.MeshStandardMaterial({color:orange?0xb77a43:0x76573f,roughness:.72});
 const lightwood=new THREE.MeshStandardMaterial({color:0xdbac72,roughness:.68});
 const rope=new THREE.MeshStandardMaterial({color:0xf2dfaf,roughness:.9});
 const gold=M.gold;
 const parent=new THREE.Group();g.add(parent);
 const add=(geom,mat,x=0,y=0,z=0)=>{
  const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
 };
 const sphere=(x,y,z,sx,sy,sz,mat)=>{const m=add(new THREE.SphereGeometry(1,12,9),mat,x,y,z);m.scale.set(sx,sy,sz);return m};
 const rod=(from,to,r,mat)=>{
  const len=from.distanceTo(to);
  const m=add(new THREE.CylinderGeometry(r,r,len,7),mat);
  m.position.copy(from.clone().add(to).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize());return m;
 };
 // rounded hull sides, highlighted gunwale, deck and stern cabin
 for(const side of [-1,1]){
  sphere(side*.29,.33,-.03,.115,.16,.66,hull);
  rod(new THREE.Vector3(side*.35,.49,-.52),new THREE.Vector3(side*.35,.49,.47),.026,lightwood);
  sphere(side*.30,.35,-.43,.07,.043,.20,bright);
 }
 sphere(0,.47,.55,.33,.15,.22,lightwood);
 if(level>1){
  sphere(0,.53,.56,.28,.21,.21,M.wall);
  sphere(0,.77,.56,.30,.09,.22,orange?M.roof:M.roofRed);
 }
 // A sculpted bow figurehead shows faction identity.
 sphere(0,.51,-.73,.12,.17,.11,gold);
 if(orange){
  sphere(0,.66,-.74,.10,.10,.10,bright);
  for(let j=0;j<7;j++){
   const a=j*2*Math.PI/7;
   rod(new THREE.Vector3(Math.cos(a)*.12,.66+Math.sin(a)*.12,-.75),
     new THREE.Vector3(Math.cos(a)*.21,.66+Math.sin(a)*.21,-.75),.020,gold);
  }
 }else{
  const crescent=add(new THREE.TorusGeometry(.13,.032,5,12,Math.PI*1.43),gold,0,.68,-.75);
  crescent.rotation.z=.47;
  sphere(.03,.68,-.79,.040,.041,.03,bright);
 }
 const sailGeometry=(width,height,billow=.16)=>{
  const vertices=[],indices=[],bands=7;
  for(let i=0;i<=bands;i++){
   const u=i/bands;
   for(let j=0;j<=bands;j++){
    const v=j/bands;
    const x=(u-.5)*width;
    const y=(v-.5)*height;
    const z=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*billow;
    vertices.push(x,y,z);
    if(i<bands&&j<bands){
     const a=i*(bands+1)+j,b=a+bands+1;
     indices.push(a,b,a+1,b,b+1,a+1);
    }
   }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);geo.computeVertexNormals();return geo;
 };
 const sail1=add(sailGeometry(.65,.88,.15),flag,-.02,.98,.07);
 sail1.rotation.z=orange?-.08:.08;
 rod(new THREE.Vector3(-.36,1.41,.06),new THREE.Vector3(.32,1.41,.06),.025,lightwood);
 rod(new THREE.Vector3(-.35,.57,.06),new THREE.Vector3(.35,.57,.06),.023,lightwood);
 if(level>=2){
  const sail2=add(sailGeometry(.37,.55,.12),bright,.11,.85,.48);
  sail2.rotation.z=-.09;
  rod(new THREE.Vector3(-.13,1.11,.48),new THREE.Vector3(.32,1.11,.48),.020,lightwood);
 }
 if(level===3){
  add(sailGeometry(.35,.43,.10),flag,.01,1.28,-.40);
  rod(new THREE.Vector3(-.15,1.5,-.4),new THREE.Vector3(.22,1.5,-.4),.021,lightwood);
  sphere(0,.37,.60,.38,.08,.21,gold);
 }
 // Cannon number directly communicates upgrade level. Still the same attack stats.
 for(let i=0;i<level;i++){
  const z=-.32+i*.29;
  for(const side of [-1,1]){
   const barrel=add(new THREE.CylinderGeometry(.057,.064,.26,8),M.cannon,side*.39,.43,z);
   barrel.rotation.z=Math.PI/2;
   sphere(side*.46,.44,z,.06,.06,.06,M.cannon);
  }
 }
 // Tiny decorative deck lantern and pennant.
 sphere(.15,.61,.49,.065,.065,.065,gold);
 const pennant=add(new THREE.ConeGeometry(.13,.25,3),flag,.16,1.62,-.10);
 pennant.rotation.z=Math.PI/2;
 parent.userData.premiumDetails=true;
}
