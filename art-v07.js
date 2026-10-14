// ARCHIPEL 0.7 — detailed handcrafted miniature finishing.
// Small, carefully placed pieces: no second island mesh and no overlapping roofs.
export function finishIsland(model,t,T){
 const g=new T.Group();model.add(g);
 const mat=(c,r=.75,m=0)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m});
 const materials={
  leaf:mat(0x4d9f72),leaf2:mat(0x9bcf84),oak:mat(0xb88654),
  stone:mat(0xb9aaa0),cream:mat(0xfff0cb),terracotta:mat(0xd99065),
  coral:mat(0xef9a9a),flower:mat(0xe895ad),bronze:mat(0xd6ac69,.38,.12)
 };
 const put=(geom,m,x,y,z)=>{const o=new T.Mesh(geom,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o};
 const stone=(x,z,s)=>{const p=put(new T.IcosahedronGeometry(1,1),materials.stone,x,.61,z);p.scale.set(s,s*.58,s*.82)};
 const succulent=(x,z,k)=>{
  put(new T.CylinderGeometry(.018,.020,.17,5),materials.oak,x,.81,z);
  for(let j=0;j<5;j++){
   const a=j*1.256;const leaf=put(new T.SphereGeometry(1,7,5),k?materials.leaf:materials.leaf2,
    x+Math.cos(a)*.07,.88,z+Math.sin(a)*.07);leaf.scale.set(.105,.045,.055);leaf.rotation.y=-a;
  }
 };
 // Rocks and curved vegetation trace only the shoreline, not the central village.
 for(let i=0;i<7;i++){
  const a=(i*2.399963+t.id*.43),r=1.20+(i%3)*.085;
  stone(Math.cos(a)*r,Math.sin(a)*r,.10+(i%2)*.05);
 }
 for(let i=0;i<4;i++){
  const a=(i*1.57+t.id*.38);
  succulent(Math.cos(a)*.94,Math.sin(a)*.94,i%2);
 }
 // Architecture detailing is tier-dependent but avoids covering the existing walls.
 if(t.owner!==null){
  const paint=t.owner===0?mat(0x9165bc):mat(0xd99050);
  // A visually distinct little cobbled path to the wooden quay.
  for(let i=0;i<4;i++){
   const p=put(new T.SphereGeometry(1,8,5),materials.stone,0,.72,.62+i*.13);
   p.scale.set(.16-i*.012,.020,.08);p.castShadow=false;
  }
  const lantern=(x,z)=>{
   put(new T.CylinderGeometry(.025,.03,.32,7),materials.oak,x,.87,z);
   const candle=put(new T.SphereGeometry(.078,8,6),materials.bronze,x,1.08,z);
   candle.material.emissive=new T.Color(0x86541a);candle.material.emissiveIntensity=.17;
  };
  lantern(-.64,.93);lantern(.64,.93);
  if(t.level>=1){
   for(const x of [-.61,.61]){
    const banner=put(new T.PlaneGeometry(.20,.30),paint,x,1.32,-.37);
    banner.material.side=T.DoubleSide;
   }
  }
  if(t.level===2){
   const parapet=put(new T.TorusGeometry(.28,.034,7,20),materials.cream,0,1.50,-.13);
   parapet.rotation.x=Math.PI/2;
   for(const x of [-.75,.75])stone(x,-.84,.16);
  }
 }else{
  // Neutral outposts have no roofs yet: instead a couple of unique floral patches.
  for(let i=0;i<4;i++){
   const a=i*1.7+t.id*.29,r=.52+i%2*.17;
   const blossom=put(new T.SphereGeometry(.057,8,6),
      i%2?materials.flower:materials.coral,Math.cos(a)*r,.75,Math.sin(a)*r);
  }
 }
 return g;
}
export function finishShip(model,player,level,T){
 const g=new T.Group();model.add(g);
 const wood=new T.MeshStandardMaterial({color:0xaa825f,roughness:.73}),
  gold=new T.MeshStandardMaterial({color:0xe6c38b,roughness:.38,metalness:.15}),
  cloth=new T.MeshStandardMaterial({color:player===0?0xcbb6e9:0xffd39e,roughness:.72,side:T.DoubleSide});
 const point=(a,b,m,r=.011)=>{
  const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);
  const o=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),7),m);
  o.position.copy(va.add(vb).multiplyScalar(.5));
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  o.castShadow=false;g.add(o);
 };
 // Rigging stands to the sides of the sails without obscuring their faces.
 point([-.12,1.77,-.22],[-.40,.51,.25],wood,.014);
 point([-.12,1.77,-.22],[.41,.54,-.09],wood,.014);
 point([-.12,.66,-.22],[.38,.67,-.22],gold,.018);
 if(level>=2){
  point([.17,1.43,.53],[.43,.50,.56],wood,.012);
  point([.17,1.43,.53],[-.31,.52,.50],wood,.012);
 }
 if(level===3){
  point([-.15,1.73,-.72],[-.37,.52,-.68],wood,.013);
  point([-.15,1.73,-.72],[.38,.53,-.79],wood,.013);
 }
 // A small carved bow stripe distinguishes faction and ship tier on close zoom.
 for(let i=0;i<level;i++){
  const stripe=new T.Mesh(new T.BoxGeometry(.21,.026,.038),cloth);
  stripe.position.set(-.11+i*.11,.53,-.73);
  stripe.castShadow=false;g.add(stripe);
 }
 const rail=new T.Mesh(new T.TorusGeometry(.11,.018,5,12),gold);
 rail.position.set(0,.63,.74);rail.rotation.x=Math.PI/2;g.add(rail);
 return g;
}
