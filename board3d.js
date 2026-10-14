import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {FACTIONS,connected} from "./game.js?v=20261014-06";
import {enhanceIsland,enhanceShip} from "./art-v03.js";
import {organicFoundation,architectureDetail,shipDetail} from "./art-v04.js";
import {craftIslandV05,craftShipV05} from "./art-v05.js";
import {islandMiniature,shipMiniature} from "./art-v06.js";
import {dockPosition} from "./docks-v06.js";

// Procedural 3D toy models: real geometry, rounded silhouettes, soft sunlight.
// No pre-rendered concept-art pasted onto flat images.
const M={
 rock:new THREE.MeshStandardMaterial({color:0x937b64,roughness:.97,flatShading:true}),
 stone:new THREE.MeshStandardMaterial({color:0xaaa08a,roughness:.95,flatShading:true}),
 sand:new THREE.MeshStandardMaterial({color:0xffd991,roughness:.93,flatShading:true}),
 grass:new THREE.MeshStandardMaterial({color:0x59b36e,roughness:.95,flatShading:true}),
 grassLight:new THREE.MeshStandardMaterial({color:0x75c96b,roughness:.95,flatShading:true}),
 tree:new THREE.MeshStandardMaterial({color:0x319866,roughness:.94,flatShading:true}),
 treeBright:new THREE.MeshStandardMaterial({color:0x65c669,roughness:.94,flatShading:true}),
 wood:new THREE.MeshStandardMaterial({color:0xb9814a,roughness:.81}),
 woodDark:new THREE.MeshStandardMaterial({color:0x704832,roughness:.88}),
 roof:new THREE.MeshStandardMaterial({color:0xed854f,roughness:.88}),
 roofRed:new THREE.MeshStandardMaterial({color:0xd76c54,roughness:.88}),
 wall:new THREE.MeshStandardMaterial({color:0xffe9c8,roughness:.89}),
 fortress:new THREE.MeshStandardMaterial({color:0xdecba5,roughness:.94}),
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
 const group=islandMiniature(tile,THREE);
 group.position.set(tile.x,.03,tile.z);
 return group;
}
function ship3D(player,level){return shipMiniature(player,level,THREE);}
export class Board3D{
 constructor(canvas,onIsland){
  this.canvas=canvas;this.onIsland=onIsland;this.scene=new THREE.Scene();
  this.scene.background=new THREE.Color(0x6eced2);
  this.scene.fog=new THREE.Fog(0x7bd5d5,38,110);
  this.camera=new THREE.OrthographicCamera(-4,4,9,-9,.1,120);
  this.camera.position.set(6.5,16.5,30);this.camera.lookAt(0,0,0);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.3));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.18;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.scene.add(new THREE.HemisphereLight(0xd7ffff,0x81b3a5,1.45));
  const sun=new THREE.DirectionalLight(0xfff1ce,2.35);
  sun.position.set(-7,20,11);sun.castShadow=true;
  sun.shadow.mapSize.set(768,768);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;
  sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;sun.shadow.camera.near=.5;sun.shadow.camera.far=56;
  sun.shadow.bias=-.0001;this.scene.add(sun);
  // Ocean v0.3: animated lagoon caustics, glitter and surf around each island.
  // World-space rings remain aligned as the camera zooms and pans.
  this.water=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},islands:{value:Array.from({length:10},()=>new THREE.Vector2(0,0))}},
    vertexShader:"varying vec2 seaUv;void main(){seaUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:[
      "precision mediump float;",
      "uniform float time;uniform vec2 islands[10];varying vec2 seaUv;",
      "float waves(vec2 p){return sin(p.x*2.7+time*.56)*sin(p.y*3.3-time*.66)*.5+.5;}",
      "void main(){",
      "vec2 world=vec2((seaUv.x-.5)*140.,(.5-seaUv.y)*140.);",
      "vec2 p=world;",
      "float slow=sin(p.x*.48+p.y*.3+time*.35)*.5+.5;",
      "float broad=sin(p.y*.91-p.x*.36-time*.40)*.5+.5;",
      "float ripple=waves(p*1.06);",
      "float caustic=pow(max(0.,sin(p.x*3.1+sin(p.y*2.6+time*.45))-sin(p.y*2.8-time*.73)),3.);",
      "float shallows=0.;float surf=0.;",
      "for(int i=0;i<10;i++){",
        "float dist=length(world-islands[i]);",
        "shallows=max(shallows,1.-smoothstep(1.50,3.15,dist));",
        "float foamBand=exp(-pow((dist-(1.25+.05*sin(time*1.4+float(i))))/.20,2.));",
        "surf=max(surf,foamBand*(.61+.39*sin(atan(world.y-islands[i].y,world.x-islands[i].x)*7.+time*1.65)));",
      "}",
      "vec3 deep=vec3(.018,.34,.55);",
      "vec3 mediumSea=vec3(.025,.58,.72);",
      "vec3 turquoise=vec3(.15,.81,.77);",
      "vec3 color=mix(deep,mediumSea,.38+slow*.25+broad*.17);",
      "color=mix(color,turquoise,shallows*.78);",
      "color+=vec3(.026,.066,.057)*caustic*(.07+.16*shallows);",
      "float highlights=pow(max(0.,sin(p.x*4.8+p.y*3.2+time*.86)),15.)*(.055+.052*ripple);",
      "color+=vec3(.22,.30,.26)*highlights;",
      "color=mix(color,vec3(.91,1.,.94),clamp(surf*.52,0.,.65));",
      "gl_FragColor=vec4(clamp(color,0.,1.),1.);",
      "}"
    ].join("\n")
  });
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(140,140),this.water);ocean.rotation.x=-Math.PI/2;ocean.position.y=-.15;this.scene.add(ocean);
  this.islandModels=[];this.boatModels=[null,null];this.routeGroup=new THREE.Group();this.scene.add(this.routeGroup);
  this.islandRoot=new THREE.Group();this.scene.add(this.islandRoot);
  this.boatRoot=new THREE.Group();this.scene.add(this.boatRoot);
  this.outline=new THREE.Group();this.scene.add(this.outline);
  this.currentGame=null;this.tweens=[];this.dragged=false;this.scale=.82;
  this.center=new THREE.Vector3(0,0,0);this.pointers=new Map();this.pinchDistance=0;this.lastTap=0;
  this.wakes=[];this.wakeClock=0;this.followPoint=null;this.seaPulse=0;this.treasureFx=null;
  this.wakeGeometry=new THREE.SphereGeometry(.095,8,5);
  this.wakeMaterial=new THREE.MeshBasicMaterial({color:0xf2fffb,transparent:true,opacity:.6,depthWrite:false});
  this.markers=document.getElementById("markers");this.markerNodes=[];
  this.raycaster=new THREE.Raycaster();this.mouse=new THREE.Vector2();
  this.clock=new THREE.Clock();
  canvas.addEventListener("pointerdown",e=>this.pointerDown(e));
  canvas.addEventListener("pointermove",e=>this.pointerMove(e));
  canvas.addEventListener("pointerup",e=>this.pointerUp(e));
  canvas.addEventListener("pointercancel",e=>{this.pointers.delete(e.pointerId);this.pinchDistance=0});
  canvas.addEventListener("wheel",e=>{
    e.preventDefault();
    this.zoomAt(this.scale*(e.deltaY<0?1.16:.86),e.clientX,e.clientY);
  },{passive:false});
  canvas.addEventListener("dblclick",e=>{e.preventDefault();this.zoomAt(this.scale*1.45,e.clientX,e.clientY)});
  window.addEventListener("resize",()=>this.resize());
  this.updateCamera();this.resize();this.animate();
 }
 resize(){
  const w=this.canvas.clientWidth||window.innerWidth,h=this.canvas.clientHeight||window.innerHeight;
  const aspect=w/h,fullWidth=Math.max(10.75,aspect*19.5),halfW=fullWidth/2,halfH=halfW/aspect;
  this.camera.left=-halfW;this.camera.right=halfW;this.camera.top=halfH;this.camera.bottom=-halfH;
  this.camera.zoom=this.scale;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
  this.canvas.dataset.cameraZoom=this.scale.toFixed(3);
  this.positionMarkers();
 }
 positionMarkers(){
  if(!this.currentGame||!this.markerNodes?.length)return;
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
  this.currentGame.islands.forEach((tile,i)=>{
   const marker=this.markerNodes[i];if(!marker)return;
   const pt=v(tile.x,.5,tile.z).project(this.camera);
   marker.style.left=((pt.x+1)*.5*w)+"px";
   marker.style.top=((-pt.y+1)*.5*h)+"px";
   marker.classList.toggle("active",this.currentGame.selected===i);
   marker.classList.toggle("violet",tile.owner===0);
   marker.classList.toggle("orange",tile.owner===1);
   marker.classList.toggle("offscreen",pt.x < -1.07 || pt.x > 1.07 || pt.y < -1.07 || pt.y > 1.07);
  });
 }
 updateCamera(){
  this.center.x=THREE.MathUtils.clamp(this.center.x,-36,36);
  this.center.z=THREE.MathUtils.clamp(this.center.z,-36,36);
  this.camera.position.set(this.center.x+6.5,16.5,this.center.z+30);
  this.camera.lookAt(this.center);this.camera.updateMatrixWorld();
  this.canvas.dataset.cameraCenter=this.center.x.toFixed(3)+","+this.center.z.toFixed(3);
  this.positionMarkers();
 }
 centerView(){
  this.center.set(0,0,0);this.scale=.82;
  this.updateCamera();this.resize();
 }
 zoomBy(factor){
  const b=this.canvas.getBoundingClientRect();
  this.zoomAt(this.scale*factor,b.left+b.width/2,b.top+b.height/2);
 }
 groundAt(px,py){
  const r=this.canvas.getBoundingClientRect();
  this.mouse.set(((px-r.left)/r.width)*2-1,-((py-r.top)/r.height)*2+1);
  this.raycaster.setFromCamera(this.mouse,this.camera);
  const hit=new THREE.Vector3();
  return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit)?hit:null;
 }
 moveFocusBy(fromX,fromY,toX,toY){
  const prev=this.groundAt(fromX,fromY),next=this.groundAt(toX,toY);
  if(!prev||!next)return;
  this.center.x+=prev.x-next.x;
  this.center.z+=prev.z-next.z;
  this.updateCamera();
 }
 zoomAt(zoom,clientX,clientY){
  const before=this.groundAt(clientX,clientY);
  this.scale=THREE.MathUtils.clamp(zoom,.56,3.45);
  this.resize();
  const after=this.groundAt(clientX,clientY);
  if(before&&after){
   this.center.x+=before.x-after.x;
   this.center.z+=before.z-after.z;
   this.updateCamera();
  }
 }
 pointerDown(e){
  this.followPoint=null;
  if(e.button!==0)return;
  e.preventDefault();
  this.canvas.setPointerCapture?.(e.pointerId);
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dragged:false});
  this.dragged=false;
  if(this.pointers.size>1){this.pinchDistance=0;this.dragged=true}
 }
 pointerMove(e){
  const point=this.pointers.get(e.pointerId);
  if(!point)return;
  e.preventDefault();
  if(Math.hypot(e.clientX-point.startX,e.clientY-point.startY)>7)point.dragged=true;
  if(this.pointers.size===2){
   const ids=[...this.pointers.keys()],others=ids.filter(id=>id!==e.pointerId);
   const other=this.pointers.get(others[0]);
   const oldDistance=Math.hypot(point.x-other.x,point.y-other.y);
   const oldCenterX=(point.x+other.x)/2,oldCenterY=(point.y+other.y)/2;
   const distance=Math.hypot(e.clientX-other.x,e.clientY-other.y);
   this.pointers.set(e.pointerId,{...point,x:e.clientX,y:e.clientY,dragged:true});
   this.dragged=true;
   if(oldDistance>6&&distance>6)this.zoomAt(this.scale*distance/oldDistance,(e.clientX+other.x)/2,(e.clientY+other.y)/2);
   this.moveFocusBy(oldCenterX,oldCenterY,(e.clientX+other.x)/2,(e.clientY+other.y)/2);
  }else if(this.pointers.size===1){
   if(point.dragged){
    this.dragged=true;
    this.moveFocusBy(point.x,point.y,e.clientX,e.clientY);
   }
   this.pointers.set(e.pointerId,{...point,x:e.clientX,y:e.clientY});
  }
 }
 pointerUp(e){
  const point=this.pointers.get(e.pointerId);
  if(!point)return;
  this.pointers.delete(e.pointerId);
  const isClick=!this.dragged&&!point.dragged&&this.pointers.size===0;
  if(!this.pointers.size)this.pinchDistance=0;
  if(!isClick)return;
  const bounds=this.canvas.getBoundingClientRect();
  this.mouse.set(((e.clientX-bounds.left)/bounds.width)*2-1,-((e.clientY-bounds.top)/bounds.height)*2+1);
  this.raycaster.setFromCamera(this.mouse,this.camera);
  const hits=this.raycaster.intersectObjects(this.islandRoot.children,true);
  for(const hit of hits){
   let obj=hit.object;
   while(obj){
    if(typeof obj.userData.islandId==="number"){
     this.onIsland(obj.userData.islandId);return;
    }
    obj=obj.parent;
   }
  }
  // Double-tapping sea gently zooms onto that area.
  const now=performance.now();
  if(now-this.lastTap<310)this.zoomAt(this.scale*1.38,e.clientX,e.clientY);
  this.lastTap=now;
 }

 // Exact same offshore berth is used at spawn, after upgrades and after every voyage.
 boatTarget(player,id){
  const p=this.currentGame.players[player],pt=dockPosition(this.currentGame.islands,id,player,p.ship);
  return v(pt.x,.34,pt.z);
 }
 rebuild(game){
  this.currentGame=game;
  this.water.uniforms.islands.value=game.islands.map(t=>new THREE.Vector2(t.x,t.z));
  this.markerNodes=[];
  if(this.markers){
   this.markers.replaceChildren();
   game.islands.forEach(t=>{
    const marker=document.createElement("div");
    marker.className="island-label";
    marker.innerHTML='<b>'+t.name+'</b><span>🌲 '+t.wood+'&nbsp; 🪨 '+t.stone+'</span>';
    marker.setAttribute("aria-label",t.name+", "+t.wood+" bois et "+t.stone+" pierres par tour");
    this.markers.appendChild(marker);this.markerNodes.push(marker);
   });
  }
  for(const g of this.islandRoot.children.slice())this.islandRoot.remove(g);
  for(const g of this.boatRoot.children.slice())this.boatRoot.remove(g);
  for(const g of this.routeGroup.children.slice())this.routeGroup.remove(g);
  this.islandModels=game.islands.map(t=>{const group=island3D(t);this.islandRoot.add(group);return{group,key:t.owner+"/"+t.level}});
  // One instanced dashed-route mesh keeps ~20 bright, readable shipping lanes cheap on mobile.
  const segments=[];
  this.routeIds=[];
  for(const [i,j] of game.edges){
   const a=game.islands[i],b=game.islands[j];
   const start=new THREE.Vector3(a.x,.06,a.z),end=new THREE.Vector3(b.x,.06,b.z);
   const direction=end.clone().sub(start),distance=direction.length();
   const norm=direction.clone().normalize(),perp=new THREE.Vector3(-norm.z,0,norm.x);
   const offset=Math.sin((i+2)*(j+3))*.16;
   const sample=u=>start.clone().lerp(end,u).addScaledVector(perp,Math.sin(u*Math.PI)*offset);
   const count=Math.max(5,Math.floor((distance-2)/.48));
   for(let n=0;n<count;n++){
    const u=.135+(.73*n/count),vU=Math.min(.865,u+.73/count*.46);
    const one=sample(u),two=sample(vU);
    if(one.distanceTo(two)<.04)continue;
    segments.push({one,two,i,j});
   }
  }
  const shape=new THREE.CylinderGeometry(.061,.061,1,6);
  const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.92,depthWrite:false});
  const marks=new THREE.InstancedMesh(shape,material,segments.length);
  marks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const dummy=new THREE.Object3D(),axis=new THREE.Vector3(0,1,0);
  for(let n=0;n<segments.length;n++){
   const seg=segments[n],delta=seg.two.clone().sub(seg.one);
   dummy.position.copy(seg.one).add(seg.two).multiplyScalar(.5);
   dummy.quaternion.setFromUnitVectors(axis,delta.clone().normalize());
   dummy.scale.set(1,delta.length(),1);dummy.updateMatrix();
   marks.setMatrixAt(n,dummy.matrix);
   marks.setColorAt(n,new THREE.Color(0xcdeef0));
   this.routeIds.push([seg.i,seg.j]);
  }
  marks.instanceMatrix.needsUpdate=true;
  if(marks.instanceColor)marks.instanceColor.needsUpdate=true;
  marks.frustumCulled=false;marks.castShadow=false;
  this.routeMarks=marks;this.routeGroup.add(marks);
  this.boatModels=[0,1].map(i=>{const p=game.players[i];const g=ship3D(i,p.ship);const berth=p.boat===null?v(0,.34,0):this.boatTarget(i,p.boat);g.position.copy(berth);g.visible=p.boat!==null;this.boatRoot.add(g);return{group:g,level:p.ship,player:i}});
  this.focus(game.selected??-1,game);
 }
 sync(game){
  if(this.currentGame!==game){this.rebuild(game);return}
  game.islands.forEach((t,i)=>{
   const key=t.owner+"/"+t.level;if(key!==this.islandModels[i].key){
    this.islandRoot.remove(this.islandModels[i].group);
    const group=island3D(t);group.userData.popAge=.72;this.islandRoot.add(group);this.islandModels[i]={group,key};
   }
  });
  game.players.forEach((p,i)=>{
   const prev=this.boatModels[i];
   if(prev.level!==p.ship){
    const old=prev.group;this.boatRoot.remove(old);const g=ship3D(i,p.ship);g.position.copy(old.position);
    this.boatRoot.add(g);g.userData.popAge=.65;g.userData.defaultScale=g.scale.x;this.boatModels[i]={group:g,level:p.ship,player:i};
   }
   const g=this.boatModels[i].group;g.visible=p.boat!==null;
   if(p.boat!==null&&!g.userData.inMotion){const berth=this.boatTarget(i,p.boat);g.position.x=berth.x;g.position.z=berth.z}
  });
  this.focus(game.selected??-1,game);
 }
 focus(id,game){
  for(let i=0;i<this.islandModels.length;i++){
   const g=this.islandModels[i].group;
   const boat=game.current===null?null:game.players[game.current]?.boat;
   const reachable=game.stage==="play"&&!game.moveUsed&&!game.actionUsed&&boat!==null&&connected(game,boat,i);
   const scale=i===id?1.09:reachable?1.045:1;
   g.userData.defaultScale=scale;
   if(!g.userData.popAge)g.scale.setScalar(scale);
  }
  if(this.routeMarks&&this.routeIds){
   const boat=game.current===null?null:game.players[game.current]?.boat;
   this.routeIds.forEach(([a,b],index)=>{
    const near=game.stage==="play"&&!game.moveUsed&&!game.actionUsed&&boat!==null&&(a===boat||b===boat);
    this.routeMarks.setColorAt(index,new THREE.Color(near?0xffd68b:0xd1f2f5));
   });
   if(this.routeMarks.instanceColor)this.routeMarks.instanceColor.needsUpdate=true;
  }
 }

 async sail(player,to,duration=950){
  const group=this.boatModels[player]?.group;if(!group)return;
  const t=this.currentGame.islands[to],end=this.boatTarget(player,to);
  // Longer sea lanes take a little longer; the camera gently follows the ship.
  const distance=group.position.distanceTo(end);
  this.followPoint=new THREE.Vector3(t.x,0,t.z);
  try{return await this.tweenBoat(group,end,Math.min(2400,Math.max(1000,duration,distance*165)));}
  finally{this.followPoint=null}
 }
 tweenBoat(group,end,duration=1180){
  return new Promise(resolve=>{
   const from=group.position.clone();
   const dx=end.x-from.x,dz=end.z-from.z;
   if(Math.hypot(dx,dz)<.01){resolve();return}
   const perpendicular=new THREE.Vector3(-dz,0,dx).normalize();
   const bulge=Math.min(.42,Math.hypot(dx,dz)*.06);
   const mid=from.clone().lerp(end,.5).addScaledVector(perpendicular,bulge);
   mid.y=.35;
   const curve=new THREE.CatmullRomCurve3([from,mid,end],false,"centripetal");
   group.userData.inMotion=true;
   this.tweens.push({group,from,end,curve,duration,elapsed:0,resolve,heading:Math.atan2(-dx,-dz)});
  });
 }
 async cannonBall(from,to,hit=true){
  const sphere=mesh(new THREE.SphereGeometry(.11,10,8),
    new THREE.MeshStandardMaterial({color:0x434b57,metalness:.3,roughness:.44}));
  sphere.castShadow=false;
  this.scene.add(sphere);
  const start=performance.now(),length=620,origin=from.clone(),goal=to.clone();
  await new Promise(resolve=>{
   const frame=(now)=>{
    const t=Math.min(1,(now-start)/length),e=t*t*(3-2*t);
    sphere.position.lerpVectors(origin,goal,e);
    sphere.position.y=.42+Math.sin(t*Math.PI)*1.42;
    if(t>=1){resolve();return}
    requestAnimationFrame(frame);
   };requestAnimationFrame(frame);
  });
  this.scene.remove(sphere);sphere.geometry.dispose();sphere.material.dispose();
  this.spark(to.x,to.z,hit?0xffd48b:0xd7ffff);
  for(let j=0;j<5;j++)this.createWake(to.x+(Math.random()-.5)*.6,to.z+(Math.random()-.5)*.6);
 }
 async battleMotion(event){
  const g=this.boatModels[event.attacker].group;
  const target=this.currentGame.islands[event.to],start=g.position.clone();
  const port=this.boatTarget(event.attacker,event.to);
  const mid=start.clone().lerp(port,.74);
  await this.tweenBoat(g,mid,Math.min(1800,Math.max(880,start.distanceTo(mid)*150)));
  this.spark(g.position.x,g.position.z,0xffd27c);
  await this.cannonBall(g.position.clone(),v(target.x,.45,target.z+.08),event.win);
  if(event.win){
    this.spark(target.x,target.z,0xffe1a2);
    await this.tweenBoat(g,port,630);
  }else{
    this.spark(g.position.x,g.position.z,0xa0eaff);
    await this.tweenBoat(g,start,890);
  }
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
 async revealTreasure(islandId,gift){
  const island=this.currentGame.islands[islandId];
  if(!island)return;
  const root=new THREE.Group();
  root.position.set(island.x,1.15,island.z);
  this.scene.add(root);
  const gold=new THREE.MeshStandardMaterial({color:0xffd678,metalness:.48,roughness:.24}),
        wood=new THREE.MeshStandardMaterial({color:0x986138,roughness:.68}),
        shine=new THREE.MeshBasicMaterial({color:0xfff3b7,transparent:true,opacity:.72,depthWrite:false});
  const base=mesh(new THREE.BoxGeometry(.91,.48,.66),wood,0,.1,0);
  root.add(base);
  for(const yy of [-.12,.22]){
   const rim=mesh(new THREE.BoxGeometry(.94,.07,.70),gold,0,yy,0);root.add(rim);
  }
  const lock=mesh(new THREE.BoxGeometry(.16,.17,.045),gold,0,.1,.365);root.add(lock);
  const lidRoot=new THREE.Group();lidRoot.position.set(0,.33,-.25);root.add(lidRoot);
  const lid=mesh(new THREE.BoxGeometry(.96,.22,.69),wood,0,.12,.28);lidRoot.add(lid);
  for(const zz of [-.045,.60])lidRoot.add(mesh(new THREE.BoxGeometry(.98,.065,.08),gold,0,.23,zz));
  const prize=new THREE.Group();root.add(prize);
  const prizeMat=new THREE.MeshStandardMaterial({color:gift==="cargo"?0xffd269:gift==="ship"?0xb5a1fb:0xffe1b1,metalness:.25,roughness:.3});
  if(gift==="cargo"){
   for(const i of [-1,0,1])prize.add(mesh(new THREE.CylinderGeometry(.16,.16,.075,18),prizeMat,i*.26,.27,0));
  }else if(gift==="ship"){
   prize.add(mesh(new THREE.BoxGeometry(.44,.11,.26),wood,0,.22,0));
   prize.add(mesh(new THREE.ConeGeometry(.27,.52,3),prizeMat,.02,.57,0));
  }else{
   prize.add(mesh(new THREE.CylinderGeometry(.27,.30,.42,8),prizeMat,0,.40,0));
   prize.add(mesh(new THREE.ConeGeometry(.36,.28,8),gold,0,.77,0));
  }
  const rays=new THREE.Group();root.add(rays);
  const raysGeo=new THREE.SphereGeometry(.055,6,5);
  for(let i=0;i<42;i++){
   const a=(i*2.399963),r=.45+(i%5)*.17;
   const ball=mesh(raysGeo,i%3===0?gold:shine,Math.cos(a)*r,.35+(i%7)*.14,Math.sin(a)*r,false);
   ball.userData.theta=a;ball.userData.phase=i*.32;rays.add(ball);
  }
  const halo=mesh(new THREE.TorusGeometry(.86,.07,7,40),
    new THREE.MeshBasicMaterial({color:0xfff5bd,transparent:true,opacity:.6,depthWrite:false}),0,-.25,0,false);
  halo.rotation.x=-Math.PI/2;root.add(halo);
  const previous={center:this.center.clone(),scale:this.scale};
  const started=performance.now(),duration=2550;
  await new Promise(resolve=>{
   const frame=now=>{
    const u=Math.min(1,(now-started)/duration),open=Math.min(1,Math.max(0,(u-.14)/.30));
    const pop=1+Math.sin(Math.min(1,u*2)*Math.PI)*.30;
    root.position.y=1.16+Math.sin(u*Math.PI)*.37;
    root.scale.setScalar(pop);
    lidRoot.rotation.x=-open*1.42;
    prize.position.y=Math.max(0,u-.20)*1.06;
    prize.rotation.y=u*Math.PI*4;
    rays.rotation.y=u*8;
    rays.children.forEach(b=>{
      b.position.y=.38+Math.sin(u*7+b.userData.phase)*.27+(u*.5);
      b.scale.setScalar(u<.13?.05:.65+Math.sin(u*12+b.userData.phase)*.36);
    });
    halo.scale.setScalar(1+u*1.7);
    halo.material.opacity=Math.max(0,.70*(1-u));
    this.center.lerpVectors(previous.center,v(island.x,0,island.z),Math.sin(Math.min(1,u*1.35)*Math.PI*.5)*.76);
    this.scale=THREE.MathUtils.lerp(previous.scale,Math.max(previous.scale,1.12),Math.sin(Math.min(1,u*1.6)*Math.PI*.5));
    this.updateCamera();this.resize();
    if(u<1)requestAnimationFrame(frame);
    else resolve();
   };requestAnimationFrame(frame);
  });
  this.scene.remove(root);
  root.traverse(o=>{
    if(o.geometry&&o.geometry!==raysGeo)o.geometry.dispose();
    if(o.material&&o.material!==gold&&o.material!==wood&&o.material!==shine&&o.material!==prizeMat)o.material.dispose();
  });
  raysGeo.dispose();gold.dispose();wood.dispose();shine.dispose();prizeMat.dispose();
  // Keep the discovered island in view so the reward can be admired.
  this.center.set(island.x,0,island.z);this.scale=Math.max(previous.scale,1.0);
  this.updateCamera();this.resize();
  this.spark(island.x,island.z,0xffdda3);
 }
 createWake(x,z){
  const wave=new THREE.Mesh(this.wakeGeometry,this.wakeMaterial.clone());
  wave.castShadow=false;wave.position.set(x,.032,z);wave.scale.set(1.2,.17,.52);
  this.scene.add(wave);this.wakes.push({wave,age:0});
 }
 animateWake(dt){
  for(const particle of this.wakes.slice()){
   particle.age+=dt;
   particle.wave.scale.x+=dt*.75;
   particle.wave.scale.z+=dt*.42;
   particle.wave.material.opacity=Math.max(0,.46-particle.age*.52);
   if(particle.age>.9){
    this.scene.remove(particle.wave);particle.wave.material.dispose();
    this.wakes.splice(this.wakes.indexOf(particle),1);
   }
  }
 }
 animate(){
  requestAnimationFrame(()=>this.animate());
  const dt=Math.min(.06,this.clock.getDelta()),time=this.clock.elapsedTime;
  this.water.uniforms.time.value=time;
  this.animateWake(dt);
  if(this.followPoint){
   this.center.x=THREE.MathUtils.lerp(this.center.x,this.followPoint.x,.032);
   this.center.z=THREE.MathUtils.lerp(this.center.z,this.followPoint.z,.032);
   this.updateCamera();
  }
  this.positionMarkers();
  this.islandModels.forEach(item=>{
   const g=item.group,age=g.userData.popAge;
   if(age>0){
    g.userData.popAge=Math.max(0,age-dt);
    const phase=1-age/.72;
    g.scale.setScalar((g.userData.defaultScale||1)*(1+.18*Math.sin(Math.PI*Math.max(0,phase))));
   }
  });
  this.boatModels.forEach((b,i)=>{
   if(b?.group?.userData.popAge>0){
    const g=b.group,age=g.userData.popAge;g.userData.popAge=Math.max(0,age-dt);
    g.scale.setScalar((g.userData.defaultScale||g.scale.x)*(1+.16*Math.sin(Math.PI*(1-age/.65))));
   }
  });
  this.boatModels.forEach((b,i)=>{if(!b)return;const g=b.group;if(!g.userData.inMotion)g.position.y=.35+Math.sin(time*2.5+i*2)*.026;g.rotation.z=Math.sin(time*1.7+i)*.029});
  for(const t of this.tweens.slice()){
   t.elapsed+=dt*1000;const u=Math.min(1,t.elapsed/t.duration),ease=u*u*(3-2*u);
   const location=t.curve.getPoint(ease),direction=t.curve.getTangent(ease);
   t.group.position.copy(location);
   t.group.position.y=.35+Math.sin(u*Math.PI)*.075;
   t.group.rotation.y=Math.atan2(-direction.x,-direction.z);
   t.group.rotation.z=Math.sin(u*Math.PI*5)*.065;
   this.wakeClock+=dt;
   if(this.wakeClock>.080){this.wakeClock=0;
    const hd=t.curve.getTangent(ease),side=new THREE.Vector3(-hd.z,0,hd.x).normalize();
    this.createWake(t.group.position.x+side.x*.23,t.group.position.z+side.z*.23);
    this.createWake(t.group.position.x-side.x*.23,t.group.position.z-side.z*.23);
   }
   if(u>=1){t.group.userData.inMotion=false;this.tweens.splice(this.tweens.indexOf(t),1);t.resolve()}
  }
  this.renderer.render(this.scene,this.camera);
 }
}
