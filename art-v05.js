// ARCHIPEL 0.5 — extra craft work on the island dioramas and fleet silhouettes.
// Build as lightweight Three.js geometry, never heavy downloads.
export function craftIslandV05(group,t,T,M){
 const g=new T.Group();group.add(g);
 const mat=(color,roughness=.84)=>new T.MeshStandardMaterial({color,roughness});
 const pale=mat(0xffedc3),plaster=mat(0xfff3db),clay=mat(0xe69e67),
       oak=mat(0x9b633e),leaf=mat(0x429c6d),leafLight=mat(0x8cce79),
       sandstone=mat(0xcfbd9b),gold=mat(0xeac36e,.45),pink=mat(0xf39db7),
       aquamarine=mat(0x4ed0cf,.25),dark=mat(0x765e49);
 const create=(shape,material,x,y,z)=>{
  const m=new T.Mesh(shape,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
 };
 const ball=(m,x,y,z,a,b,c)=>{
  const mesh=create(new T.IcosahedronGeometry(1,1),m,x,y,z);mesh.scale.set(a,b,c);return mesh;
 };
 const pole=(m,x,y,z,r,height)=>{
  return create(new T.CylinderGeometry(r*.75,r,height,7),m,x,y,z);
 };
 const flourish=(x,z,k=0)=>{
  pole(oak,x,.86,z,.042,.42);
  const canopy=ball(k?leafLight:leaf,x,1.17,z,.19,.23,.20);
  ball(leafLight,x-.08,1.26,z,.14,.11,.15);
  return canopy;
 };
 const shell=(x,z)=>{ball(pale,x,.62,z,.09,.04,.065);ball(plaster,x+.05,.65,z-.03,.045,.032,.04)};
 // tiny, consistent coastal debris & tropical touches, with deterministic placement
 for(let j=0;j<5;j++){
  const angle=(t.id*.6+j*2.43),r=.90+j%2*.14;
  shell(Math.cos(angle)*r,Math.sin(angle)*r);
 }
 for(let j=0;j<3;j++){
  const angle=t.id*.23+j*2.09,r=.65+j%2*.14;
  ball(j%2?pink:gold,Math.cos(angle)*r,.74,Math.sin(angle)*r,.065,.026,.065);
 }
 const detailSpot={coast:[-.62,.32],waterfall:[-.63,-.18],flower:[.42,-.55],
 coral:[-.60,.30],ruins:[.58,.43],cliff:[-.47,.43],forest:[0,-.63],
 volcano:[-.66,.10],arch:[-.65,.1],mist:[.55,-.30]};
 const [dx,dz]=detailSpot[t.theme]||[0,.5];
 if(t.theme==="forest"){
  flourish(-.55,-.58);flourish(.61,-.52,1);
 }else if(t.theme==="coast"){
  flourish(dx,dz);ball(aquamarine,.69,.60,.67,.27,.032,.13);
 }else if(t.theme==="waterfall"){
  const pool=ball(aquamarine,.58,.66,-.15,.28,.05,.20);pool.castShadow=false;
  for(let j=0;j<4;j++)ball(plaster,.44+j*.11,.73,-.12,.032,.025,.035);
 }else if(t.theme==="flower"){
  for(let j=0;j<6;j++){
   const a=j*Math.PI/3,x=dx+Math.cos(a)*.19,z=dz+Math.sin(a)*.17;
   pole(leaf,x,.81,z,.016,.21);ball(j%2?pink:gold,x,1.00,z,.06,.055,.05);
  }
 }else if(t.theme==="coral"){
  const bay=ball(aquamarine,dx,.70,dz,.30,.04,.25);bay.castShadow=false;
  for(let j=0;j<4;j++)ball(j%2?pink:pale,dx+Math.cos(j*1.57)*.21,.76,dz+Math.sin(j*1.57)*.17,.07,.09,.06);
 }else if(t.theme==="ruins"){
  for(let j=0;j<3;j++)ball(sandstone,dx+(j-1)*.17,.81,dz+(j%2)*.18,.14,.07,.12);
 }else if(t.theme==="cliff"){
  ball(sandstone,dx,.87,dz,.21,.22,.18);ball(leafLight,dx,1.08,dz,.17,.035,.15);
 }else if(t.theme==="volcano"){
  for(let j=0;j<3;j++)ball(dark,dx+j*.17,.79,dz+j*.08,.13,.09,.09);
 }else if(t.theme==="arch"){
  ball(sandstone,dx,.78,dz,.26,.12,.17);
 }else if(t.theme==="mist"){
  flourish(dx,dz);
  for(let j=0;j<3;j++)ball(plaster,dx+(j-1)*.13,1.20+(j%2)*.06,dz,.16,.07,.12);
 }
 if(t.owner!==null){
  // Village 0: welcoming dock, window lights and two gardens.
  // Town 1: larger civic hall; town 2: unmistakable keep, crenellations and towers.
  const faction=t.owner===0?mat(0x8e70c7):mat(0xf3a36c);
  for(const x of [-.40,.44]){
   ball(leafLight,x,.75,.56,.17,.035,.12);
   ball(pink,x-.05,.80,.57,.06,.04,.05);
   ball(gold,x+.07,.81,.55,.055,.047,.055);
  }
  pole(oak,.03,.92,1.14,.045,.55);
  const beacon=ball(gold,.03,1.25,1.14,.10,.11,.10);beacon.castShadow=false;
  if(t.level>=1){
   const hall=create(new T.BoxGeometry(.43,.36,.36),plaster,.25,.95,-.32);
   const roof=create(new T.ConeGeometry(.34,.24,4),faction,.25,1.24,-.32);roof.rotation.y=Math.PI/4;
   for(const x of [-.25,.25])ball(aquamarine,x,1.03,-.52,.065,.075,.035);
  }
  if(t.level>=2){
   const keep=create(new T.CylinderGeometry(.28,.34,.71,8),sandstone,-.03,1.04,-.20);
   create(new T.ConeGeometry(.39,.32,8),faction,-.03,1.56,-.20);
   for(let j=0;j<6;j++){
    const a=j*Math.PI/3;
    const batt=create(new T.BoxGeometry(.12,.12,.13),plaster,
      -.03+Math.cos(a)*.30,1.43,-.20+Math.sin(a)*.30);batt.rotation.y=a;
   }
   // Larger flag for immediate fortified-city recognition at normal zoom.
   const flag=create(new T.BoxGeometry(.38,.20,.025),faction,.08,1.86,-.20);
   flag.rotation.z=.10;
   pole(oak,-.12,1.70,-.20,.023,.62);
  }
 }
 return g;
}
export function craftShipV05(group,player,level,T,M){
 const g=new T.Group();group.add(g);
 const mat=(color,roughness=.63)=>new T.MeshStandardMaterial({color,roughness});
 const gold=mat(0xebc47e,.32),hull=mat(player===0?0x76604f:0x9d6741),
  trim=mat(player===0?0xbca8df:0xffd6a1,.48),
  flag=mat(player===0?0x9267d3:0xf49348,.58),cannon=mat(0x555b68,.40);
 const add=(geo,m,x,y,z)=>{
  const object=new T.Mesh(geo,m);object.position.set(x,y,z);
  object.castShadow=true;object.receiveShadow=true;g.add(object);return object;
 };
 const sph=(m,x,y,z,rx,ry,rz)=>{
  const o=add(new T.SphereGeometry(1,9,7),m,x,y,z);o.scale.set(rx,ry,rz);return o;
 };
 const line=(a,b,m,r=.017)=>{
  const p=new T.Vector3(...a),q=new T.Vector3(...b),delta=q.clone().sub(p);
  const o=add(new T.CylinderGeometry(r,r,delta.length(),7),m);
  o.position.copy(p.clone().add(q).multiplyScalar(.5));
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
 };
 // Richer front and rear silhouette; scale increases visibly with level.
 sph(hull,0,.27,-.61,.26,.18,.25);
 sph(trim,0,.50,-.67,.13,.12,.12);
 for(const side of [-1,1]){
  sph(trim,side*.28,.48,.37,.055,.055,.34);
  for(let j=0;j<level;j++){
   const z=-.34+j*.23;
   const gun=add(new T.CylinderGeometry(.056,.07,.22,7),cannon,side*.42,.42,z);gun.rotation.z=Math.PI/2;
   sph(gold,side*.36,.44,z,.075,.028,.080);
  }
 }
 const rig=[[-.24,1.02,-.15],[.23,1.03,-.15]];
 line(rig[0],rig[1],gold,.023);
 if(level===1){
  // Small skiff: modest single pennant, low deck.
  sph(flag,0,1.52,-.12,.09,.07,.06);
 }else{
  // Level 2: full aft mast and prominent secondary sail.
  line([.12,.49,.41],[.12,1.56,.41],hull,.035);
  const sail=add(new T.PlaneGeometry(.35,.47,4,3),trim,.13,1.21,.43);
  sail.material.side=T.DoubleSide;sail.rotation.y=.12;
  const fin=add(new T.ConeGeometry(.15,.23,3),flag,.25,1.60,.41);fin.rotation.z=Math.PI/2;
 }
 if(level===3){
  // Level 3: third mast / top-sail, gilded captain's aft castle.
  line([-.10,.51,-.41],[-.10,1.76,-.41],hull,.037);
  const top=add(new T.PlaneGeometry(.40,.45,4,3),flag,-.08,1.53,-.39);top.material.side=T.DoubleSide;
  sph(gold,0,.70,.56,.33,.09,.18);
  for(let j=0;j<4;j++)sph(gold,(j-1.5)*.14,.77,.70,.04,.07,.04);
  add(new T.ConeGeometry(.24,.23,6),flag,0,.91,.48);
 }
 // Tiny pennant above the signature faction figurehead.
 line([0,.62,-.69],[0,1.00,-.69],hull,.014);
 const pennant=add(new T.ConeGeometry(.09,.17,3),flag,.09,.99,-.69);pennant.rotation.z=Math.PI/2;
}
