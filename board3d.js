import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {FACTIONS,connected} from "./game.js";

// Procedural 3D toy models: real geometry, rounded silhouettes, soft sunlight.
// No pre-rendered concept-art pasted onto flat images.
const M={
 rock:new THREE.MeshStandardMaterial({color:0x9d9c83,roughness:.97,flatShading:true}),
 stone:new THREE.MeshStandardMaterial({color:0xb2b7a4,roughness:.95,flatShading:true}),
 sand:new THREE.MeshStandardMaterial({color:0xffe6a8,roughness:.93,flatShading:true}),
 grass:new THREE.MeshStandardMaterial({color:0x7fbc69,roughness:.95,flatShading:true}),
 grassLight:new THREE.MeshStandardMaterial({color:0x9cd67c,roughness:.95,flatShading:true}),
 tree:new THREE.MeshStandardMaterial({color:0x469c68,roughness:.94,flatShading:true}),
 treeBright:new THREE.MeshStandardMaterial({color:0x72c877,roughness:.94,flatShading:true}),
 wood:new THREE.MeshStandardMaterial({color:0xb9814a,roughness:.81}),
 woodDark:new THREE.MeshStandardMaterial({color:0x704832,roughness:.88}),
 roof:new THREE.MeshStandardMaterial({color:0xe7a163,roughness:.88}),
 roofRed:new THREE.MeshStandardMaterial({color:0xd68565,roughness:.88}),
 wall:new THREE.MeshStandardMaterial({color:0xffefd6,roughness:.89}),
 fortress:new THREE.MeshStandardMaterial({color:0xe2d3ae,roughness:.94}),
 window:new THREE.MeshStandardMaterial({color:0x6a8da1,roughness:.4}),
 gold:new THREE.MeshStandardMaterial({color:0xeab95d,metalness:.3,roughness:.32}),
 cannon:new THREE.MeshStandardMaterial({color:0x4c5968,metalness:.27,roughness:.55}),
 pearl:new THREE.MeshStandardMaterial({color:0xfff8df,roughness:.27}),
 flower:new THREE.MeshStandardMaterial({color:0xe576a5,roughness:.76}),
 coral:new THREE.MeshStandardMaterial({color:0xe48291,roughness:.83}),
 lake:new THREE.MeshStandardMaterial({color:0x48cbdc,transparent:true,opacity:.85,roughness:.21}),
 volcanic:new THREE.MeshStandardMaterial({color:0x70716e,roughness:1,flatShading:true}),
 purple:new THREE.MeshStandardMaterial({color:0x915ad6,roughness:.8,side:THREE.DoubleSide}),
 orange:new THREE.MeshStandardMaterial({color:0xfa962e,roughness:.8,side:THREE.DoubleSide}),
 foam:new THREE.MeshBasicMaterial({color:0xebfffb,transparent:true,opacity:.49,depthWrite:false})
};
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const mesh=(geometry,material,x=0,y=0,z=0,cast=true)=>{
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);
  m.castShadow=cast;m.receiveShadow=true;return m;
};
function ball(parent,mat,x,y,z,rx,ry,rz,segments=10){
 const m=mesh(new THREE.SphereGeometry(1,segments,7),mat,x,y,z);
 m.scale.set(rx,ry,rz);parent.add(m);return m;
}
function cyl(parent,mat,top,bottom,height,x,y,z,sides=10){
 const m=mesh(new THREE.CylinderGeometry(top,bottom,height,sides,1),mat,x,y,z);
 parent.add(m);return m;
}
function box(parent,mat,wx,wy,wz,x,y,z){
 const m=mesh(new THREE.BoxGeometry(wx,wy,wz),mat,x,y,z);parent.add(m);return m;
}
function cone(parent,mat,r,h,x,y,z,sides=8){
 const m=mesh(new THREE.ConeGeometry(r,h,sides),mat,x,y,z);parent.add(m);return m;
}
function tree(g,x,z,s=1){
 cyl(g,M.woodDark,.065*s,.09*s,.48*s,x,.88*s,z,6);
 ball(g,M.tree,x,1.15*s,z,.32*s,.25*s,.31*s,8);
 ball(g,M.treeBright,x-.17*s,1.22*s,z,.25*s,.22*s,.22*s,7);
 ball(g,M.tree,x+.12*s,1.35*s,z,.24*s,.20*s,.27*s,7);
}
function palm(g,x,z,s=1){
 const stem=cyl(g,M.wood,.055*s,.075*s,.64*s,x,.87*s,z,7);stem.rotation.z=.17;
 for(let j=0;j<5;j++){
  const a=(Math.PI*2*j)/5;
  const fr=ball(g,j%2?M.tree:M.treeBright,x+Math.cos(a)*.23*s,1.23*s,z+Math.sin(a)*.23*s,.29*s,.075*s,.11*s,7);
  fr.rotation.y=-a;
 }
}
function house(g,x,z,variant=0,s=.88){
 box(g,M.wall,.44*s,.37*s,.41*s,x,.79,z);
 cone(g,variant?M.roofRed:M.roof,.37*s,.28*s,x,1.10,z,4).rotation.y=Math.PI/4;
 box(g,M.woodDark,.092*s,.17*s,.03*s,x,.70,z+.215*s);
}
function town(g,level,owner){
 const F=FACTIONS[owner],flagColor=owner===0?M.purple:M.orange;
 house(g,-.28,-.07,0,.87);house(g,.22,.29,1,.75);
 if(level>=1){
  house(g,-.4,.45,1,.77);house(g,.44,-.39,0,.82);
  box(g,M.wall,.4,.48,.42,.10,.85,-.02);
  cone(g,M.roof,.36,.28,.10,1.22,-.02,4).rotation.y=Math.PI/4;
 }
 if(level>=2){
  const wallz=[-.72,.71];
  for(const z of wallz)box(g,M.fortress,1.45,.23,.14,0,.64,z);
  for(const x of [-.72,.72])box(g,M.fortress,.14,.23,1.4,x,.64,0);
  for(const [x,z] of [[-.7,-.7],[.7,.7]]){
   cyl(g,M.fortress,.17,.19,.63,x,.83,z,7);
   cone(g,M.roofRed,.22,.22,x,1.26,z,7);
  }
 }
 // Warm wood quay.
 box(g,M.wood,.45,.07,.72,.06,.44,1.02);
 for(const x of [-.16,.28])cyl(g,M.woodDark,.045,.045,.25,x,.38,1.28,6);
 cyl(g,M.woodDark,.027,.027,.82,-.54,1.04,.11,7);
 const flag=mesh(new THREE.PlaneGeometry(.42,.25),flagColor,-.33,1.31,.11);
 flag.material=flagColor;g.add(flag);
 const fin=cone(g,M.gold,.095,.21,-.54,1.54,.11,5);
 return F;
}
function themed(g,type,seed){
 if(type==="coast"){ball(g,M.sand,.62,.50,-.61,.35,.06,.26);ball(g,M.pearl,.83,.56,-.43,.12,.07,.12);palm(g,-.55,-.35,.85)}
 else if(type==="waterfall"){
  box(g,M.rock,.46,.68,.35,.67,.74,-.42);
  box(g,M.lake,.17,.71,.035,.63,.73,-.19);
  ball(g,M.lake,.69,.50,-.10,.27,.06,.18);tree(g,-.66,-.5,.75);
 }else if(type==="flower"){
  for(let j=0;j<6;j++){const angle=(j/6)*Math.PI*2;ball(g,j%2?M.flower:M.coral,Math.cos(angle)*.73,.57,Math.sin(angle)*.64,.12,.07,.12,7)}
  tree(g,.66,-.46,.68);
 }else if(type==="coral"){
  for(let j=0;j<4;j++){const a=j*1.5;cone(g,j%2?M.coral:M.flower,.11,.28,Math.cos(a)*.72,.64,Math.sin(a)*.77,6)}
  palm(g,-.66,-.35,.74);
 }else if(type==="ruins"){
  for(const x of [-.65,-.34]){cyl(g,M.fortress,.105,.115,.47,x,.76,-.5,7);box(g,M.fortress,.5,.1,.18,-.50,1.01,-.5)}
 }else if(type==="cliff"){
  box(g,M.rock,.55,.35,.37,.64,.64,-.48);box(g,M.sand,.54,.11,.34,.65,.88,-.48);
 }else if(type==="forest"){
  tree(g,-.67,-.45,.78);tree(g,.65,-.43,.8);tree(g,.77,.16,.63);
 }else if(type==="volcano"){
  const c=cone(g,M.volcanic,.4,.62,.60,.81,-.46,9);
  cone(g,M.rock,.17,.16,.60,1.13,-.46,9);
 }else if(type==="arch"){
  const x=.59,z=-.53;
  box(g,M.stone,.14,.51,.16,x-.20,.73,z);
  box(g,M.stone,.14,.51,.16,x+.20,.73,z);
  box(g,M.stone,.57,.14,.16,x,.98,z);
 }else if(type==="mist"){
  for(let j=0;j<3;j++)ball(g,M.foam,.46+(j-.9)*.12,.59,-.47+(j%2)*.12,.33,.11,.18,9);
 }
}
function island3D(tile){
 const g=new THREE.Group();g.userData.islandId=tile.id;
 cyl(g,M.rock,1.00,.83,.46,0,.18,0,11);
 cyl(g,M.sand,1.03,.96,.20,0,.48,0,11);
 cyl(g,tile.theme==="volcano"?M.grass:M.grassLight,.83,.87,.14,0,.61,0,11);
 const shore=cyl(g,M.foam,1.11,1.1,.022,0,.14,0,18);shore.castShadow=false;
 themed(g,tile.theme,tile.id);
 if(tile.owner!==null)town(g,tile.level,tile.owner);
 // Invisible but genuinely 3D tap target, with tagged object.
 const pick=mesh(new THREE.CylinderGeometry(1.25,1.25,.65,18),
   new THREE.MeshBasicMaterial({visible:false}),0,.66,0,false);
 pick.userData.islandId=tile.id;g.add(pick);
 g.position.set(tile.x,.03,tile.z);return g;
}
function ship3D(player,level){
 const g=new THREE.Group(),orange=player===1;
 const sailMat=orange?M.orange:M.purple,trim=orange?0xe5b56c:0xbeb4dd;
 const SIZE=[.66,.83,1.01][level-1];
 ball(g,M.woodDark,0,.20,0,.36,.20,.70);
 ball(g,M.wood,0,.27,-.07,.36,.19,.65);
 cone(g,M.woodDark,.23,.38,0,.18,-.73,5).rotation.x=Math.PI/2;
 const deck=box(g,M.wood,.52,.06,.85,0,.41,.05);
 cyl(g,M.woodDark,.039,.05,1.15,0,.95,-.1,7);
 // Triangle sail faces towards camera in x-y plane.
 const points=[new THREE.Vector3(-.33,.52,.01),new THREE.Vector3(.30,.52,.01),new THREE.Vector3(-.20,1.43,.01)];
 const geo=new THREE.BufferGeometry().setFromPoints(points);geo.setIndex([0,1,2]);geo.computeVertexNormals();
 const sail=mesh(geo,sailMat,0,0,-.10);g.add(sail);
 const backSail=mesh(new THREE.PlaneGeometry(.37,.52),M.wall,.17,1.00,.25);backSail.rotation.y=.10;g.add(backSail);
 box(g,M.woodDark,.05,.08,.04,0,1.52,-.1);
 const pennant=mesh(new THREE.ConeGeometry(.15,.30,3),sailMat,.14,1.51,-.10);pennant.rotation.z=Math.PI/2;g.add(pennant);
 if(level>=2){
  cyl(g,M.woodDark,.028,.033,.80,.08,.82,.38,6);
  const g2=new THREE.BufferGeometry().setFromPoints([v(-.1,.60,.40),v(.32,.60,.40),v(.08,1.18,.40)]);g2.setIndex([0,1,2]);g2.computeVertexNormals();g.add(mesh(g2,sailMat));
 }
 for(let i=0;i<level-1;i++){
  const z=(i-.1)*.27-.30;
  for(const side of [-1,1]){
   const cannon=cyl(g,M.cannon,.053,.060,.20,side*.35,.40,z,8);cannon.rotation.z=Math.PI/2;
  }
 }
 ball(g,M.gold,0,.22,-.65,.08,.09,.10);
 g.scale.setScalar(SIZE);g.userData.player=player;
 return g;
}
export class Board3D{
 constructor(canvas,onIsland){
  this.canvas=canvas;this.onIsland=onIsland;this.scene=new THREE.Scene();
  this.scene.background=new THREE.Color(0x6eced2);
  this.scene.fog=new THREE.Fog(0x7bd5d5,22,75);
  this.camera=new THREE.OrthographicCamera(-4,4,9,-9,.1,120);
  this.camera.position.set(0,29,17);this.camera.lookAt(0,0,0);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.35;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.scene.add(new THREE.HemisphereLight(0xd7ffff,0x7eac9e,2.5));
  const sun=new THREE.DirectionalLight(0xfff1c6,3.2);
  sun.position.set(-7,20,11);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;
  sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;sun.shadow.camera.near=.5;sun.shadow.camera.far=56;
  sun.shadow.bias=-.0001;this.scene.add(sun);
  this.water=new THREE.ShaderMaterial({
   uniforms:{time:{value:0}},
   vertexShader:"varying vec2 uvv; void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
   fragmentShader:"uniform float time;varying vec2 uvv;void main(){vec2 p=uvv*22.;float swell=sin(p.y*2.0+p.x*1.25+time*.42)*.5+.5;float waves=sin(p.y*6.2-p.x*1.8-time*.90)*.5+.5;float glimmer=smoothstep(.90,1.,sin((p.x+p.y)*7.-time*.9)*.5+.5);vec3 deep=vec3(.023,.41,.56);vec3 shallow=vec3(.06,.66,.72);vec3 col=mix(deep,shallow,.35+.37*swell+.11*waves);col+=glimmer*.045;gl_FragColor=vec4(col,1.);}"
  });
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(140,140),this.water);ocean.rotation.x=-Math.PI/2;ocean.position.y=-.15;this.scene.add(ocean);
  this.islandModels=[];this.boatModels=[null,null];this.routeGroup=new THREE.Group();this.scene.add(this.routeGroup);
  this.islandRoot=new THREE.Group();this.scene.add(this.islandRoot);
  this.boatRoot=new THREE.Group();this.scene.add(this.boatRoot);
  this.outline=new THREE.Group();this.scene.add(this.outline);
  this.currentGame=null;this.tweens=[];this.pointer=null;this.dragged=false;this.scale=1;
  this.raycaster=new THREE.Raycaster();this.mouse=new THREE.Vector2();
  this.clock=new THREE.Clock();
  canvas.addEventListener("pointerdown",e=>this.pointerDown(e));
  canvas.addEventListener("pointermove",e=>this.pointerMove(e));
  canvas.addEventListener("pointerup",e=>this.pointerUp(e));
  canvas.addEventListener("pointercancel",()=>this.pointer=null);
  canvas.addEventListener("wheel",e=>{e.preventDefault();this.scale=Math.max(.86,Math.min(1.6,this.scale+(e.deltaY<0?.08:-.08)));this.resize()},{passive:false});
  window.addEventListener("resize",()=>this.resize());
  this.resize();this.animate();
 }
 resize(){
  const w=this.canvas.clientWidth||window.innerWidth,h=this.canvas.clientHeight||window.innerHeight;
  const aspect=w/h,fullWidth=Math.max(8.65,aspect*17.6),halfW=fullWidth/2,halfH=halfW/aspect;
  this.camera.left=-halfW;this.camera.right=halfW;this.camera.top=halfH;this.camera.bottom=-halfH;
  this.camera.zoom=this.scale;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
 }
 pointerDown(e){if(e.button!==0)return;this.pointer={x:e.clientX,y:e.clientY,id:e.pointerId};this.dragged=false}
 pointerMove(e){if(!this.pointer||e.pointerId!==this.pointer.id)return;if(Math.hypot(e.clientX-this.pointer.x,e.clientY-this.pointer.y)>12)this.dragged=true}
 pointerUp(e){
  if(!this.pointer||e.pointerId!==this.pointer.id)return;
  this.pointer=null;if(this.dragged)return;
  const bounds=this.canvas.getBoundingClientRect();this.mouse.set(((e.clientX-bounds.left)/bounds.width)*2-1,-((e.clientY-bounds.top)/bounds.height)*2+1);
  this.raycaster.setFromCamera(this.mouse,this.camera);
  const hits=this.raycaster.intersectObjects(this.islandRoot.children,true);
  for(const hit of hits){let obj=hit.object;while(obj){if(typeof obj.userData.islandId==="number"){this.onIsland(obj.userData.islandId);return}obj=obj.parent}}
 }
 rebuild(game){
  this.currentGame=game;
  for(const g of this.islandRoot.children.slice())this.islandRoot.remove(g);
  for(const g of this.boatRoot.children.slice())this.boatRoot.remove(g);
  for(const g of this.routeGroup.children.slice())this.routeGroup.remove(g);
  this.islandModels=game.islands.map(t=>{const group=island3D(t);this.islandRoot.add(group);return{group,key:t.owner+"/"+t.level}});
  for(const [i,j] of game.edges){
   const a=game.islands[i],b=game.islands[j];
   const from=v(a.x,.025,a.z),to=v(b.x,.025,b.z),distance=from.distanceTo(to);
   const dir=to.clone().sub(from).normalize();
   for(let step=.75;step<distance-.62;step+=.42){
    const mark=ball(this.routeGroup,M.foam,from.x+dir.x*step,.006,from.z+dir.z*step,.095,.016,.105,6);mark.castShadow=false;
   }
  }
  this.boatModels=[0,1].map(i=>{const p=game.players[i];const g=ship3D(i,p.ship);const loc=p.boat===null?{x:0,z:0}:game.islands[p.boat];g.position.set(loc.x+.8,.32,loc.z+.65);g.visible=p.boat!==null;this.boatRoot.add(g);return{group:g,level:p.ship,player:i}});
  this.focus(game.selected??-1,game);
 }
 sync(game){
  if(this.currentGame!==game){this.rebuild(game);return}
  game.islands.forEach((t,i)=>{
   const key=t.owner+"/"+t.level;if(key!==this.islandModels[i].key){
    this.islandRoot.remove(this.islandModels[i].group);
    const group=island3D(t);this.islandRoot.add(group);this.islandModels[i]={group,key};
   }
  });
  game.players.forEach((p,i)=>{
   const prev=this.boatModels[i];
   if(prev.level!==p.ship){
    const old=prev.group;this.boatRoot.remove(old);const g=ship3D(i,p.ship);g.position.copy(old.position);
    this.boatRoot.add(g);this.boatModels[i]={group:g,level:p.ship,player:i};
   }
   const g=this.boatModels[i].group;g.visible=p.boat!==null;
   if(p.boat!==null&&!g.userData.inMotion){const t=game.islands[p.boat];g.position.x=t.x+.8;g.position.z=t.z+.65}
  });
  this.focus(game.selected??-1,game);
 }
 focus(id,game){
  for(let i=0;i<this.islandModels.length;i++){
   const g=this.islandModels[i].group;
   const reachable=game.stage==="play"&&!game.moveUsed&&!game.actionUsed&&game.players[game.current].boat!==null
     &&connected(game,game.players[game.current].boat,i);
   g.scale.setScalar(i===id?1.09:reachable?1.035:1);
  }
 }
 async sail(player,to,duration=950){
  const group=this.boatModels[player]?.group;if(!group)return;
  const t=this.currentGame.islands[to],end=v(t.x+.8,.32,t.z+.65);
  return this.tweenBoat(group,end,duration);
 }
 tweenBoat(group,end,duration=950){
  return new Promise(resolve=>{
   const from=group.position.clone();
   const dx=end.x-from.x,dz=end.z-from.z;
   if(Math.hypot(dx,dz)<.01){resolve();return}
   group.userData.inMotion=true;
   const facing=Math.atan2(dx,dz);
   this.tweens.push({group,from,end,duration,elapsed:0,resolve,heading:facing});
  });
 }
 async battleMotion(event){
  const g=this.boatModels[event.attacker].group,target=this.currentGame.islands[event.to],start=g.position.clone();
  const mid=v(start.x+(target.x+.8-start.x)*.67,.32,start.z+(target.z+.65-start.z)*.67);
  await this.tweenBoat(g,mid,670);
  this.spark(target.x+.35,target.z+.45,event.win?0xffe1a2:0xffa58e);
  await new Promise(r=>setTimeout(r,350));
  if(event.win)await this.tweenBoat(g,v(target.x+.8,.32,target.z+.65),470);
  else await this.tweenBoat(g,start,570);
 }
 spark(x,z,color=0xffe6ac){
  const particles=new THREE.Group();this.scene.add(particles);
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1});
  for(let i=0;i<11;i++){
   const a=i/11*Math.PI*2,r=.16+Math.random()*.35;
   const orb=mesh(new THREE.SphereGeometry(.045+Math.random()*.04,5,4),mat,x+Math.cos(a)*r,.7+Math.random()*.27,z+Math.sin(a)*r,false);particles.add(orb)
  }
  const started=performance.now();const remove=()=>{const t=(performance.now()-started)/650;particles.scale.setScalar(1+t*.9);mat.opacity=Math.max(0,1-t);if(t>=1){this.scene.remove(particles);mat.dispose()}else requestAnimationFrame(remove)};requestAnimationFrame(remove);
 }
 animate(){
  requestAnimationFrame(()=>this.animate());
  const dt=Math.min(.06,this.clock.getDelta()),time=this.clock.elapsedTime;
  this.water.uniforms.time.value=time;
  this.boatModels.forEach((b,i)=>{if(!b)return;const g=b.group;if(!g.userData.inMotion)g.position.y=.35+Math.sin(time*2.5+i*2)*.026;g.rotation.z=Math.sin(time*1.7+i)*.029});
  for(const t of this.tweens.slice()){
   t.elapsed+=dt*1000;const u=Math.min(1,t.elapsed/t.duration),ease=u*u*(3-2*u);
   t.group.position.lerpVectors(t.from,t.end,ease);t.group.position.y=.33+Math.sin(u*Math.PI)*.13;
   t.group.rotation.y=t.heading*.18;
   if(u>=1){t.group.userData.inMotion=false;this.tweens.splice(this.tweens.indexOf(t),1);t.resolve()}
  }
  this.renderer.render(this.scene,this.camera);
 }
}
