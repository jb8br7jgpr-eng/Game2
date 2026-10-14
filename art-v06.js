// ARCHIPEL 0.6 - one cohesive 3D mesh hierarchy per island / ship.
// Replaces the old stack of v0.3 + v0.4 + v0.5 decorations that intersected.
export function islandMiniature(t,T){
 const g=new T.Group();g.userData.islandId=t.id;
 const mat=(color,roughness=.86,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness,flatShading:false});
 const m={
  rock:mat(0xa18d82),shadow:mat(0x837b79),sand:mat(0xfde0a2),
  sandLight:mat(0xffedc1),grass:mat(t.theme==="volcano"?0x84ab75:0x83c479),
  grassLight:mat(0x9fd58a),tree:mat(0x378f69),tree2:mat(0x6abb76),
  stem:mat(0xb48759),wall:mat(0xffe9ce),roof:mat(0xe89e72),
  wood:mat(0x996744),woodLight:mat(0xd0a170),stone:mat(0xd5c6aa),
  gold:mat(0xf4cf76,.35,.12),water:mat(0x49cbd3,.28),
  coral:mat(0xf4a3a9),pink:mat(0xe99bb9),lava:mat(0xee8965,.54),
  ash:mat(0x777b7b)
 };
 const faction=t.owner===0?mat(0x9874d8):mat(0xffa15a);
 const add=(geo,material,x,y,z,parent=g)=>{
  const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 const sph=(material,x,y,z,rx,ry,rz,parent=g)=>{
  const o=add(new T.SphereGeometry(1,12,8),material,x,y,z,parent);
  o.scale.set(rx,ry,rz);return o;
 };
 const box=(material,x,y,z,w,h,d,parent=g)=>add(new T.BoxGeometry(w,h,d),material,x,y,z,parent);
 const tower=(material,x,y,z,r,h,parent=g)=>add(new T.CylinderGeometry(r*.9,r,h,9),material,x,y,z,parent);
 const roof=(material,x,y,z,r,h,n=7,parent=g)=>add(new T.ConeGeometry(r,h,n),material,x,y,z,parent);
 function landRing(top,bottom,r1,r2,material,seed){
  const n=40,coords=[],faces=[];
  const radius=(i,r)=>{
   const a=i*2*Math.PI/n;
   return r*(1+.050*Math.sin(a*3+seed)+.037*Math.cos(a*7+seed*.52)+.021*Math.sin(a*11+seed));
  };
  for(const [y,r] of [[top,r1],[bottom,r2]]){
   for(let i=0;i<n;i++){
    const a=2*Math.PI*i/n,rr=radius(i,r);
    coords.push(Math.cos(a)*rr,y,Math.sin(a)*rr);
   }
  }
  coords.push(0,top+.005,0);
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   faces.push(i,j,n+i,j,n+j,n+i);
   faces.push(n*2,j,i);
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute("position",new T.Float32BufferAttribute(coords,3));
  geo.setIndex(faces);geo.computeVertexNormals();
  add(geo,material,0,0,0);
 }
 const seed=t.id*1.37+.75;
 landRing(.33,-.24,1.45,1.12,m.rock,seed);
 landRing(.49,.28,1.55,1.45,m.sand,seed);
 landRing(.58,.49,1.44,1.53,m.sandLight,seed);
 landRing(.71,.59,1.15,1.29,m.grass,seed);
 // Foamy transparent tide ribbon around the miniature island.
 const surf=add(new T.TorusGeometry(1.63,.055,5,48),
   new T.MeshBasicMaterial({color:0xe9fffb,transparent:true,opacity:.52,depthWrite:false}),0,.045,0);
 surf.rotation.x=-Math.PI/2;surf.castShadow=false;
 function pebble(x,z,r=.10){sph(m.stone,x,.58,z,r,.06,r*.75)}
 function palm(x,z,size=1){
  const stem=tower(m.stem,x,.95,z,.055*size,.51*size);stem.rotation.z=.12;
  const top=.95+.31*size;
  for(let j=0;j<7;j++){
   const a=j*2*Math.PI/7;
   const frond=sph(j%2?m.tree:m.tree2,
    x+Math.cos(a)*.25*size,top,z+Math.sin(a)*.25*size,.27*size,.065*size,.09*size);
   frond.rotation.y=-a;frond.rotation.z=Math.sin(a)*.17;
  }
  sph(m.gold,x,top-.045,z,.062,.066,.06);
 }
 function flower(x,z){
  tower(m.tree,x,.77,z,.023,.19);
  for(let j=0;j<5;j++){
   const a=j*2*Math.PI/5;
   sph(j%2?m.coral:m.pink,x+Math.cos(a)*.06,.89,z+Math.sin(a)*.06,.055,.033,.055);
  }
  sph(m.gold,x,.90,z,.042,.04,.042);
 }
 function house(x,z,s=.78,color=m.roof){
  box(m.wall,x,.88,z,.39*s,.30*s,.37*s);
  const r=roof(color,x,1.065,z,.32*s,.22*s,4);r.rotation.y=Math.PI/4;
  box(m.wood,x,.805,z+.196*s,.073*s,.14*s,.025);
  sph(m.gold,x-.10*s,.89,z+.20*s,.025,.030,.025);
 }
 function themeLandmark(scale=1,x=0,z=0){
  const parent=new T.Group();parent.position.set(x,0,z);parent.scale.setScalar(scale);g.add(parent);
  if(t.theme==="coast"){
   sph(m.sandLight,0,.85,0,.30,.13,.25,parent);
   for(let j=0;j<5;j++){
    const a=j*2*Math.PI/5;
    sph(m.wall,Math.cos(a)*.21,1.02,Math.sin(a)*.21,.10,.07,.09,parent);
   }
   sph(m.gold,0,1.1,0,.11,.13,.11,parent);
  }else if(t.theme==="waterfall"){
   sph(m.rock,.0,.99,0,.37,.36,.31,parent);
   sph(m.grassLight,0,1.24,-.03,.32,.07,.28,parent);
   for(let j=0;j<3;j++){
    box(m.water,-.22+j*.15,.90,.28,.115,.54,.05,parent);
    sph(m.water,-.20+j*.15,.70,.32,.13,.035,.12,parent);
   }
  }else if(t.theme==="flower"){
   tower(m.stem,0,1.07,0,.064,.64,parent);
   for(let j=0;j<8;j++){
    const a=j*Math.PI/4;
    sph(j%2?m.pink:m.coral,Math.cos(a)*.25,1.42,Math.sin(a)*.23,.16,.10,.12,parent);
   }
   sph(m.gold,0,1.48,0,.15,.13,.14,parent);
  }else if(t.theme==="coral"){
   sph(m.water,0,.76,0,.40,.06,.31,parent);
   for(let j=0;j<8;j++){
    const a=j*Math.PI/4;
    tower(j%2?m.coral:m.pink,Math.cos(a)*.35,.91,Math.sin(a)*.26,.075,.30,parent);
    sph(j%2?m.pink:m.gold,Math.cos(a)*.35,1.07,Math.sin(a)*.26,.11,.07,.10,parent);
   }
  }else if(t.theme==="ruins"){
   for(const dx of [-.32,0,.32]){
    tower(m.stone,dx,.99,0,.10,.56,parent);
    sph(m.wall,dx,1.28,0,.13,.050,.11,parent);
   }
   box(m.stone,0,1.36,0,.94,.15,.26,parent);
  }else if(t.theme==="cliff"){
   for(const dx of [-.24,.14,.37]){
    sph(dx===.14?m.sand:m.rock,dx,1.00,0,.22,.36,.30,parent);
   }
   sph(m.grassLight,0,1.30,0,.32,.06,.28,parent);
  }else if(t.theme==="forest"){
   for(let j=0;j<4;j++){
    const a=j*Math.PI/2,dx=Math.cos(a)*.24,dz=Math.sin(a)*.24;
    tower(m.stem,dx,.97,dz,.042,.41,parent);
    sph(j%2?m.tree2:m.tree,dx,1.25,dz,.20,.26,.20,parent);
   }
  }else if(t.theme==="volcano"){
   roof(m.ash,0,1.17,0,.47,.75,12,parent);
   sph(m.lava,0,1.52,0,.17,.055,.15,parent);
   sph(m.coral,.13,1.64,-.07,.090,.13,.08,parent);
  }else if(t.theme==="arch"){
   for(const dx of [-.24,.24])tower(m.rock,dx,1.04,0,.125,.65,parent);
   box(m.stone,0,1.4,0,.76,.20,.26,parent);
   sph(m.grassLight,0,1.53,0,.29,.045,.19,parent);
  }else if(t.theme==="mist"){
   for(let j=0;j<5;j++){
    const a=j*Math.PI*2/5;
    const haze=sph(m.wall,Math.cos(a)*.25,1.10+j%2*.035,Math.sin(a)*.21,.22,.11,.19,parent);
    haze.castShadow=false;
   }
   sph(m.water,0,.80,0,.25,.06,.22,parent);
  }
 }
 // Environment sits at the edges, leaving the miniature town's central plot open.
 palm(-1.00,-.24,.70);
 if(t.theme==="forest"||t.theme==="coast")palm(1.00,-.25,.64);
 for(let j=0;j<5;j++){
  const a=seed+j*2.27;
  pebble(Math.cos(a)*1.34,Math.sin(a)*1.30,.075+(j%2)*.028);
 }
 if(t.owner===null){
  themeLandmark(.92,0,-.10);
  for(let j=0;j<4;j++){const a=seed+j*1.6;flower(Math.cos(a)*.87,Math.sin(a)*.87)}
 }else{
  // Small signature behind town; no duplicate houses/walls stacked on top.
  themeLandmark(.42,.85,-.59);
  const quay=box(m.woodLight,0,.47,1.40,.39,.080,.52);
  for(const x of [-.17,.17])tower(m.wood,x,.48,1.64,.045,.24);
  if(t.level===0){
   house(-.40,-.04,.88);house(.38,.08,.82,m.woodLight);
  }else if(t.level===1){
   house(-.48,-.26,.74);house(.42,-.22,.76,m.woodLight);
   house(-.45,.41,.67);house(.40,.41,.69);
   const townHall=box(m.wall,0,.98,0,.44,.52,.40);
   const townRoof=roof(faction,0,1.32,0,.36,.24,4);townRoof.rotation.y=Math.PI/4;
   sph(m.gold,0,1.48,0,.075,.095,.07);
  }else{
   // One coherent walled city with a clear central keep & visible corner towers.
   box(m.stone,0,.92,-.72,1.75,.34,.16);
   box(m.stone,0,.92,.74,1.75,.34,.16);
   for(const x of [-.87,.87])box(m.stone,x,.92,0,.16,.34,1.42);
   for(const [x,z] of [[-.84,-.70],[.84,-.70],[-.84,.70],[.84,.70]]){
    tower(m.stone,x,1.04,z,.19,.73);
    roof(faction,x,1.53,z,.25,.27,7);
   }
   house(-.43,.27,.62);house(.42,.27,.62,m.woodLight);
   tower(m.stone,0,1.13,-.13,.30,1.01);
   roof(faction,0,1.76,-.13,.39,.34,8);
   box(m.wood,0,1.04,.19,.13,.29,.04);
  }
  tower(m.wood,-.73,1.10,-.52,.025,.76);
  const flag=box(faction,-.50,1.35,-.52,.44,.23,.025);flag.rotation.y=-.16;
 }
 // Invisible collider independent of decorative details.
 const pick=add(new T.CylinderGeometry(1.69,1.69,1.1,24),
   new T.MeshBasicMaterial({visible:false}),0,.74,0);
 pick.castShadow=false;pick.userData.islandId=t.id;
 return g;
}
export function shipMiniature(player,level,T){
 const g=new T.Group();g.userData.player=player;
 const mat=(color,rough=.7,metal=0)=>new T.MeshStandardMaterial({color,roughness:rough,metalness:metal});
 const m={
  hull:mat(player===0?0x765643:0x97623d),
  deck:mat(0xd6a575),rim:mat(0xf0d4a2),
  wood:mat(0x946742),flag:mat(player===0?0x9864d7:0xf69a4c,.60),
  sail:mat(player===0?0xd6c2f1:0xffddab,.70),
  gold:mat(0xf4c475,.32,.15),gun:mat(0x444c56,.42,.18),
  white:mat(0xfff3dd,.73)
 };
 m.sail.side=T.DoubleSide;m.flag.side=T.DoubleSide;
 const add=(geo,material,x=0,y=0,z=0)=>{
  const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);
  mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
 };
 const orb=(material,x,y,z,rx,ry,rz)=>{
  const mesh=add(new T.SphereGeometry(1,12,9),material,x,y,z);mesh.scale.set(rx,ry,rz);return mesh;
 };
 const pole=(material,x,y,z,r,h)=>add(new T.CylinderGeometry(r*.90,r,h,8),material,x,y,z);
 // Smooth tapering planked hull constructed as ONE mesh, no intersecting ellipsoids.
 const profile=[[-.94,.05],[-.64,.36],[.18,.45],[.66,.37],[.87,.22]];
 const vertices=[],indices=[],N=10;
 for(const [z,w] of profile){
  for(let i=0;i<N;i++){
   const a=i*Math.PI*2/N;
   vertices.push(Math.sin(a)*w,.33+Math.cos(a)*.18,z);
  }
 }
 for(let j=0;j<profile.length-1;j++)for(let i=0;i<N;i++){
  const k=(i+1)%N,a=j*N+i,b=(j+1)*N+i,c=j*N+k,d=(j+1)*N+k;
  indices.push(a,c,b,c,d,b);
 }
 const hullGeo=new T.BufferGeometry();
 hullGeo.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
 hullGeo.setIndex(indices);hullGeo.computeVertexNormals();
 const hull=add(hullGeo,m.hull,0,0,0);hull.material.side=T.DoubleSide;
 orb(m.deck,0,.47,0,.35,.075,.65);
 // Real handrails lie *outside* the hull, not through the mast or the sails.
 for(const side of [-1,1]){
  const rail=orb(m.rim,side*.37,.48,.10,.047,.054,.52);
  for(let j=0;j<level;j++){
   const z=-.40+j*.32;
   const barrel=pole(m.gun,side*.48,.40,z,.064,.24);barrel.rotation.z=Math.PI/2;
   orb(m.gold,side*.37,.44,z,.065,.040,.075);
  }
 }
 const sailcloth=(x,y,z,w,h,material)=>{
  const arr=[],faces=[],N=6;
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
   const u=i/N,v=j/N;
   arr.push(x+(u-.5)*w,y+(v-.5)*h,z+.15*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));
   if(i<N&&j<N){
    const a=i*(N+1)+j,b=a+N+1;faces.push(a,b,a+1,b,b+1,a+1);
   }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute("position",new T.Float32BufferAttribute(arr,3));
  geo.setIndex(faces);geo.computeVertexNormals();
  add(geo,material);
 };
 pole(m.wood,-.12,1.04,-.22,.048,1.32);
 sailcloth(-.08,1.17,-.22,.68,.96,m.flag);
 // Trim is a fine line atop the rounded sail, not overlapping another cloth.
 orb(m.rim,-.08,1.70,-.22,.37,.033,.035);
 if(level>=2){
  pole(m.wood,.17,.90,.53,.040,1.0);
  sailcloth(.17,.99,.54,.44,.64,m.sail);
  const aft=orb(m.wood,0,.55,.63,.35,.14,.20);
  orb(m.gold,0,.64,.65,.20,.055,.16);
 }
 if(level===3){
  pole(m.wood,-.15,1.14,-.72,.038,1.35);
  sailcloth(-.14,1.42,-.72,.52,.59,m.sail);
  const castle=add(new T.BoxGeometry(.54,.39,.37),m.white,0,.69,.57);
  add(new T.ConeGeometry(.38,.28,4),m.flag,0,1.00,.57).rotation.y=Math.PI/4;
  for(const x of [-.17,.17])orb(m.gold,x,.82,.78,.055,.060,.03);
 }
 // Premium crest and bow lantern.
 orb(m.gold,0,.49,-.91,.095,.12,.11);
 const crest=player===0?add(new T.TorusGeometry(.125,.032,6,16,Math.PI*1.40),m.gold,0,.64,-.95):
  add(new T.IcosahedronGeometry(.13,1),m.gold,0,.64,-.95);
 if(player===0)crest.rotation.z=.55;
 pole(m.wood,0,1.78,-.22,.026,.36);
 add(new T.ConeGeometry(.13,.23,3),m.flag,.15,1.94,-.22).rotation.z=Math.PI/2;
 const size=[.88,1.10,1.36][level-1];g.scale.setScalar(size);
 g.userData.modelRadius=size*1.13;
 return g;
}
