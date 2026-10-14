// V0.8 island art study. All geometry is real 3D — no flat concept-art billboard.
// The approach is deliberately modular for future replacement with authored GLB assets.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
const PI=Math.PI;
export const palette={
 sand:0xffdf9f,ivory:0xfff1c8,grass:0x7abf6e,grass2:0x9ad581,
 rock:0xaaa59a,rock2:0xc0b8a2,wood:0x9f6b43,
 foliage:0x3c9965,foliageLight:0x69bb67,leafDark:0x2b7c54
};
function material(color,roughness=.82,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness,flatShading:false})}
function inst(parent,geo,mat,xyz=[0,0,0],shadow=true){
 const mesh=new THREE.Mesh(geo,mat);
 mesh.position.set(...xyz);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function orb(parent,mat,pos,sc=[1,1,1],segments=11){
 const item=inst(parent,new THREE.SphereGeometry(1,segments,8),mat,pos);
 item.scale.set(...sc);return item;
}
function bark(parent,mat,pts,radius){
 const c=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
 return inst(parent,new THREE.TubeGeometry(c,7,radius,7,false),mat);
}
function strut(parent,mat,pa,pb,thickness=.04){
 const a=new THREE.Vector3(...pa),b=new THREE.Vector3(...pb),d=b.clone().sub(a);
 const mesh=inst(parent,new THREE.CylinderGeometry(thickness*.85,thickness,d.length(),7),mat);
 mesh.position.copy(a.add(b).multiplyScalar(.5));
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
 return mesh;
}
function reliefLayer(parent,material,low,high,outer,inner,phase){
 const count=56,points=[],faces=[];
 const shoreline=i=>{
  const angle=i/count*2*PI;
  return 1+.041*Math.sin(3*angle+phase)+.026*Math.sin(8*angle-phase*.3)+.014*Math.cos(13*angle+phase*.7);
 };
 for(const [y,r] of [[high,outer],[low,inner]]){
  for(let i=0;i<count;i++){
   const angle=i*2*PI/count,rr=r*shoreline(i);
   points.push(Math.cos(angle)*rr,y+.021*Math.sin(angle*5+phase),Math.sin(angle)*rr);
  }
 }
 points.push(0,high+.006,0);
 for(let i=0;i<count;i++){
  const j=(i+1)%count;
  faces.push(i,j,count+i,j,count+j,count+i);
  faces.push(count*2,j,i);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
 geo.setIndex(faces);geo.computeVertexNormals();
 return inst(parent,geo,material);
}
function palm(group,mats,x,z,height,tilt){
 const start=[x,.85,z],middle=[x+tilt*.48,.85+height*.49,z-.10],
 top=[x+tilt,.85+height,z-.21];
 const wood=mats.trunk;
 bark(group,wood,[start,middle,top],.105);
 for(let r=0;r<5;r++){
  const y=.91+r*height/5,px=x+tilt*(y-.85)/height;
  const ring=inst(group,new THREE.TorusGeometry(.112,.010,5,9),mats.ring,[px,y,z-.04]);
  ring.rotation.x=PI*.5;
 }
 for(let j=0;j<8;j++){
  const a=j*PI/4,
   start=new THREE.Vector3(...top),
   end=start.clone().add(new THREE.Vector3(Math.cos(a)*(.75+height*.07),-.23,Math.sin(a)*(.75+height*.07)));
  const bend=start.clone().lerp(end,.52).add(new THREE.Vector3(0,.16,0));
  const vertices=[],normals=[],indices=[];
  for(let k=0;k<6;k++){
   const t=k/5,spine=start.clone().multiplyScalar((1-t)*(1-t)).addScaledVector(bend,2*t*(1-t)).addScaledVector(end,t*t);
   const width=Math.sin(t*PI)*(.16+height*.020);
   for(const side of [-1,1]){
    const right=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
    const p=spine.clone().addScaledVector(right,width*side);
    vertices.push(p.x,p.y+(1-t)*.025,p.z);
   }
   if(k<5){const n=k*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const leaf=inst(group,geo,j%2?mats.palm2:mats.palm1);
  leaf.material.side=THREE.DoubleSide;
  for(let seg=2;seg<5;seg++){
   // slim individual leaflets, not heavy broad ovals
   const t=seg/5,center=start.clone().lerp(end,t);
   const twig=strut(group,mats.palm1,[center.x-.04,center.y,center.z],[center.x+.10,center.y-.05,center.z+.17],.012);
   twig.castShadow=false;
  }
 }
 for(let j=0;j<3;j++)orb(group,mats.coconut,[top[0]+(j-1)*.07,top[1]-.13,top[2]+.04],[.082,.09,.085]);
}
function flowers(parent,mats,x,z,variant=0){
 strut(parent,mats.stem,[x,.74,z],[x,.91,z],.015);
 for(let j=0;j<5;j++){
  const a=j*2*PI/5;
  orb(parent,variant?mats.flower2:mats.flower,[x+Math.cos(a)*.064,.93,z+Math.sin(a)*.064],[.082,.038,.064],8);
 }
 orb(parent,mats.center,[x,.955,z],[.047,.047,.049],8);
}
function geometryRoof(parent,mats){
 // Two solid pitched roof planes, handcrafted straw eaves and shingle rows.
 const roofMat=mats.thatch;
 const left=inst(parent,new THREE.BoxGeometry(1.37,.11,2.21),roofMat,[-.66,2.58,-.59]);
 left.rotation.z=.45;
 const right=inst(parent,new THREE.BoxGeometry(1.37,.11,2.21),roofMat,[.66,2.58,-.59]);
 right.rotation.z=-.45;
 // Leaf thatch shingles follow the roof slope, but do not interpenetrate the roof.
 for(const side of [-1,1]){
  for(let row=0;row<7;row++){
   const f=(row+.5)/7,y=2.98-f*.61,x=side*(.11+f*1.10);
   for(let c=0;c<9;c++){
    const z=-1.57+c*.245+((row%2)*.10);
    const reed=inst(parent,new THREE.BoxGeometry(.16,.025,.245),c%3===0?mats.thatch2:mats.thatch,[x,y,z]);
    reed.rotation.z=-side*.45;
    reed.castShadow=false;
   }
  }
 }
}
function createCabin(root,mats){
 const g=new THREE.Group();g.position.set(.52,0,-.72);root.add(g);
 // raised stone patio; makes the architecture seem rooted in terrain
 const porch=inst(g,new THREE.BoxGeometry(3.4,.22,2.9),mats.stone,[0,.91,0]);
 const body=inst(g,new THREE.BoxGeometry(2.52,1.35,2.0),mats.wall,[0,1.64,-.49]);
 for(const x of [-1.28,1.28])for(const z of [-1.28,.31]){
  strut(g,mats.oak,[x,.99,z],[x,2.31,z],.068);
 }
 geometryRoof(g,mats);
 // entrance & windows
 inst(g,new THREE.BoxGeometry(.64,1.12,.075),mats.door,[0,1.50,.55]);
 inst(g,new THREE.TorusGeometry(.11,.03,7,14),mats.brass,[.22,1.43,.61]).rotation.y=PI/2;
 for(const x of [-.96,.96]){
  inst(g,new THREE.BoxGeometry(.43,.42,.09),mats.window,[x,1.71,.56],false);
  strut(g,mats.cream,[x-.23,1.71,.63],[x+.23,1.71,.63],.023);
  strut(g,mats.cream,[x,1.49,.63],[x,1.93,.63],.023);
  inst(g,new THREE.BoxGeometry(.52,.08,.13),mats.oak,[x,1.47,.62]);
 }
 // porch posts, awning and railing
 for(const x of [-1.44,1.44]){
  strut(g,mats.oak,[x,.99,1.06],[x,2.12,1.06],.061);
  orb(g,mats.brass,[x,2.14,1.06],[.07,.075,.07]);
 }
 inst(g,new THREE.BoxGeometry(3.0,.10,.65),mats.awning,[0,2.21,.79]).rotation.x=.10;
 for(const x of [-1.47,1.47])for(const z of [.72,1.30]){
  strut(g,mats.oak,[x,.92,z],[x,1.40,z],.043);
 }
 for(const x of [-1.47,1.47])
  strut(g,mats.oak,[x,1.41,.72],[x,1.41,1.30],.031);
 // steps from balcony to beach, flanking flowers
 for(let j=0;j<5;j++){
  inst(g,new THREE.BoxGeometry(1.12,.11,.32),mats.stone,[0,.91-j*.093,1.64+j*.30]);
 }
 for(let j=0;j<5;j++){
  const bx=-1.30+(j%2)*.35,bz=1.42+j*.25;
  orb(g,mats.grass,[bx,.92,bz],[.18,.09,.18]);
 }
 // lanterns create warm visual focal points
 const glow=new THREE.MeshStandardMaterial({color:0xffdf94,emissive:0xffa633,emissiveIntensity:.9,roughness:.36});
 for(const x of [-1.25,1.25]){
  inst(g,new THREE.BoxGeometry(.13,.18,.13),mats.oak,[x,1.85,.80]);
  const light=orb(g,glow,[x,1.77,.82],[.095,.13,.09],8);light.castShadow=false;
  strut(g,mats.brass,[x,1.90,.81],[x,2.01,.81],.017);
 }
 const lantern=new THREE.PointLight(0xffb65b,1.1,7,2);
 lantern.position.set(-.9,1.8,.73);g.add(lantern);
 for(let j=0;j<3;j++){
  const x=-1.3+j*1.3;
  inst(g,new THREE.CylinderGeometry(.13,.15,.30,9),mats.oak,[x,1.05,1.0]);
  inst(g,new THREE.CylinderGeometry(.155,.155,.045,9),mats.brass,[x,1.24,1.0]);
 }
}
function createDock(root,mats){
 const pier=new THREE.Group();root.add(pier);
 const z=1.6;
 for(let j=0;j<9;j++){
  const x=-2.55-j*.36;
  const plank=inst(pier,new THREE.BoxGeometry(.34,.11,1.03),mats.dock,[x,.43,z]);
  plank.rotation.y=(j%3-1)*.024;
  for(const side of [-1,1]){
   if(j%2===0){
    strut(pier,mats.oak,[x,.12,z+side*.53],[x,.83,z+side*.53],.065);
    orb(pier,mats.brass,[x,.84,z+side*.53],[.068,.045,.067]);
   }
  }
 }
 // Long hand-rails with natural sagging from rope curves.
 for(const side of [-1,1]){
  const pts=[];
  for(let j=0;j<9;j++){const x=-2.55-j*.36;pts.push([x,.84-.08*Math.sin((j/8)*PI),z+side*.53])}
  bark(pier,mats.rope,pts,.024);
 }
}
function createBoat(mats){
 const root=new THREE.Group();
 const hullMat=mats.hull,planking=mats.hullLight;
 // hull lofted as watertight rounded timber shell
 const slices=[[-.98,.06],[-.72,.32],[-.20,.46],[.36,.43],[.76,.27],[.94,.08]];
 const pts=[],idx=[],N=14;
 for(const [z,w] of slices){
  for(let n=0;n<N;n++){
   const a=n*2*PI/N;
   pts.push(Math.sin(a)*w,.24+Math.cos(a)*.21,z);
  }
 }
 for(let j=0;j<slices.length-1;j++)for(let n=0;n<N;n++){
  const a=j*N+n,b=j*N+(n+1)%N,c=(j+1)*N+n,d=(j+1)*N+(n+1)%N;
  idx.push(a,b,c,b,d,c);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));geo.setIndex(idx);geo.computeVertexNormals();
 const hull=inst(root,geo,hullMat);hull.material.side=THREE.DoubleSide;
 orb(root,planking,[0,.43,0],[.37,.060,.64]);
 for(const side of [-1,1]){
  const rail=orb(root,mats.wood,[side*.35,.49,0],[.05,.057,.66]);
  bark(root,mats.rope,[[side*.34,.55,-.58],[side*.42,.56,0],[side*.33,.55,.55]],.017);
 }
 const mast=inst(root,new THREE.CylinderGeometry(.045,.064,1.90,9),mats.wood,[-.06,1.25,-.15]);
 strut(root,mats.wood,[-.48,1.95,-.15],[.46,1.95,-.15],.034);
 strut(root,mats.wood,[-.42,.60,-.15],[.45,.60,-.15],.027);
 const verts=[],tris=[],K=10;
 for(let i=0;i<=K;i++)for(let j=0;j<=K;j++){
  const u=i/K,v=j/K;
  verts.push((u-.5)*.90,1.28+(v-.5)*1.18,-.15+.16*Math.sin(u*PI)*Math.sin(v*PI));
  if(i<K&&j<K){const a=i*(K+1)+j,b=a+K+1;tris.push(a,b,a+1,b,b+1,a+1)}
 }
 const sailGeo=new THREE.BufferGeometry();
 sailGeo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));sailGeo.setIndex(tris);sailGeo.computeVertexNormals();
 const sail=inst(root,sailGeo,mats.sail);sail.material.side=THREE.DoubleSide;
 // more visible framing and rigging
 strut(root,mats.rope,[-.06,2.2,-.15],[-.33,.60,-.74],.012);
 strut(root,mats.rope,[-.06,2.2,-.15],[.33,.55,.63],.012);
 for(const z of [-.51,.31]){
  const barrel=inst(root,new THREE.CylinderGeometry(.125,.125,.30,9),mats.oak,[.16,.57,z]);
  inst(root,new THREE.TorusGeometry(.127,.015,5,10),mats.brass,[.16,.68,z]).rotation.x=PI/2;
 }
 const lantern=orb(root,mats.lantern,[-.28,.75,.61],[.075,.12,.08]);lantern.castShadow=false;
 const flags=inst(root,new THREE.ConeGeometry(.13,.28,3),mats.flag,[-.06,2.33,-.15]);flags.rotation.z=PI/2;
 return root;
}
export function buildDiorama(scene){
 const mats={
  rock:material(palette.rock),rock2:material(palette.rock2),
  sand:material(palette.sand),sandLight:material(palette.ivory),
  grass:material(palette.grass),grass2:material(palette.grass2),
  stem:material(0x87633d),palm1:material(0x36895c),palm2:material(0x5eab5d),
  ring:material(0xb98b5c),trunk:material(0x9b794e),
  coconut:material(0x92713f),soil:material(0x897c73),dock:material(0xb58458),
  rope:material(0xc5a77d),wood:material(0x997047),oak:material(0x8e5f3c),
  brass:material(0xe9c17a,.37,.12),stone:material(0xc4b9a8),wall:material(0xf7e5bf),
  door:material(0x4f9b9c),window:material(0x84bed0,.28),cream:material(0xffe9cb),
  thatch:material(0xc39a58),thatch2:material(0xd9af6b),awning:material(0xf0debb),
  flower:material(0xf3a1b8),flower2:material(0xf3a064),center:material(0xf7cf64),
  hull:material(0x926344,.64),hullLight:material(0xc39161),
  sail:material(0xffeed4,.88),flag:material(0x518faa),lantern:material(0xffd07c,.40)
 };
 const island=new THREE.Group();island.position.set(1,0,0);scene.add(island);
 reliefLayer(island,mats.rock,-.62,.12,2.99,2.42,1.6);
 reliefLayer(island,mats.sand,.09,.40,3.45,3.21,1.64);
 reliefLayer(island,mats.sandLight,.40,.48,3.27,3.35,1.65);
 reliefLayer(island,mats.grass,.49,.70,2.55,2.83,.82);
 reliefLayer(island,mats.grass2,.71,.745,2.33,2.52,.82);
 for(let i=0;i<24;i++){
  const a=i*2.399963,r=2.5+(i%4)*.19;
  const piece=orb(island,i%3?mats.rock:mats.rock2,[Math.cos(a)*r,.48,Math.sin(a)*r],[.20+(i%3)*.11,.19+(i%3)*.08,.25],9);
  piece.rotation.y=a;
 }
 // dense vegetation on the rear half, clear beach and front shore
 const palms=[[-2.05,-1.2,1.86,-.28],[-.80,-2.05,2.23,-.25],[1.95,-1.66,2.03,.24],[2.25,.58,1.70,.36]];
 for(const args of palms)palm(island,mats,...args);
 for(let i=0;i<55;i++){
  const a=i*2.399963+.6,r=.92+(i%7)*.24,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(z>1.3||x>-.80&&x<1.5&&z>-.95)continue; // preserve beach and cabin frontage
  const shrub=orb(island,i%3?mats.palm1:mats.palm2,[x,.80,z],[.16+(i%4)*.055,.13+(i%3)*.045,.17]);
  shrub.rotation.y=a;
 }
 for(let i=0;i<34;i++){
  const a=i*2.399963+.19,r=1.08+(i%6)*.23,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(z>1.45||x>-.9&&x<1.2&&z>-.7)continue;
  flowers(island,mats,x,z,i%3);
 }
 createCabin(island,mats);createDock(island,mats);
 // natural submerged reefs and little rocks beyond the shore
 const reef=new THREE.Group();scene.add(reef);
 for(let j=0;j<36;j++){
  const a=j*2.399963,r=3.9+(j%7)*.49,x=1+Math.cos(a)*r,z=Math.sin(a)*r;
  const rock=orb(reef,j%4?mats.rock:mats.grass2,[x,-.60,z],
    [.13+(j%3)*.14,.06+(j%3)*.035,.14+(j%2)*.10],10);
  rock.castShadow=false;
 }
 const boat=createBoat(mats);
 boat.position.set(-5.35,.18,2.75);boat.rotation.y=.14;scene.add(boat);
 const shoreLight=new THREE.Group();scene.add(shoreLight);
 const seabed=new THREE.Mesh(new THREE.PlaneGeometry(200,200),
  new THREE.MeshStandardMaterial({color:0x227d83,roughness:1}));
 seabed.rotation.x=-PI/2;seabed.position.y=-.90;seabed.receiveShadow=false;scene.add(seabed);
 return {island,boat,mats,reef};
}
