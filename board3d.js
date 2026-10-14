import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {connected} from "./game.js?v=20261014-08";
import {islandMiniature,shipMiniature} from "./art-v06.js";
import {finishIsland,finishShip} from "./art-v07.js";
import {dockPosition} from "./docks-v06.js";

// Procedural 3D toy models: real geometry, rounded silhouettes, soft sunlight.
// No pre-rendered concept-art pasted onto flat images.
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const mesh=(geometry,material,x=0,y=0,z=0,cast=true)=>{
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);
  m.castShadow=cast;m.receiveShadow=true;return m;
};
function island3D(tile){
 const group=islandMiniature(tile,THREE);
 finishIsland(group,tile,THREE);
 group.position.set(tile.x,.03,tile.z);
 return group;
}
function ship3D(player,level){const group=shipMiniature(player,level,THREE);finishShip(group,player,level,THREE);return group;}
export class Board3D{
 constructor(canvas,onIsland){
  this.canvas=canvas;this.onIsland=onIsland;this.scene=new THREE.Scene();
  this.scene.background=new THREE.Color(0x6eced2);
  this.scene.fog=new THREE.Fog(0x7bd5d5,155,490);
  this.camera=new THREE.OrthographicCamera(-4,4,9,-9,.1,680);
  this.camera.position.set(26,66,120);this.camera.lookAt(0,0,0);
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
      "vec2 world=vec2((seaUv.x-.5)*640.,(.5-seaUv.y)*640.);",
      "vec2 p=world;",
      "float slow=sin(p.x*.48+p.y*.3+time*.35)*.5+.5;",
      "float broad=sin(p.y*.91-p.x*.36-time*.40)*.5+.5;",
      "float ripple=waves(p*1.06);",
      "float micro=sin(p.x*5.4+time*1.2+sin(p.y*2.1))*sin(p.y*6.1-time*.83);",
      "float drifts=sin(p.y*.28+time*.20)*sin(p.x*.43-time*.13);",
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
      "color+=vec3(.036,.076,.074)*caustic*(.09+.21*shallows);",
      "color+=vec3(.013,.040,.035)*(micro*.5+.5)*(.17+.30*shallows);",
      "color+=vec3(.02,.042,.046)*drifts;",
      "float highlights=pow(max(0.,sin(p.x*4.8+p.y*3.2+time*.86)),15.)*(.055+.052*ripple);",
      "color+=vec3(.22,.30,.26)*highlights;",
      "color=mix(color,vec3(.91,1.,.94),clamp(surf*.56,0.,.67));",
      "gl_FragColor=vec4(clamp(color,0.,1.),1.);",
      "}"
    ].join("\n")
  });
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(640,640),this.water);ocean.rotation.x=-Math.PI/2;ocean.position.y=-.15;this.scene.add(ocean);
  this.islandModels=[];this.boatModels=[null,null];this.routeGroup=new THREE.Group();this.scene.add(this.routeGroup);
  this.islandRoot=new THREE.Group();this.scene.add(this.islandRoot);
  this.boatRoot=new THREE.Group();this.scene.add(this.boatRoot);
  this.outline=new THREE.Group();this.scene.add(this.outline);
  this.currentGame=null;this.tweens=[];this.dragged=false;this.scale=.82;
  this.center=new THREE.Vector3(0,0,0);this.pointers=new Map();this.pinchDistance=0;this.lastTap=0;
  this.wakes=[];this.wakeClock=0;this.followPoint=null;this.seaPulse=0;this.treasureFx=null;this.retreatTargets=[];this.refugeMarkers=new THREE.Group();this.scene.add(this.refugeMarkers);
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
   // Faction owner badge uses the exact ownership index displayed in the 3D scene.
   const ownerTag=tile.owner===null?"":(tile.owner===0?"☾ ":"☀ ")+this.currentGame.players[tile.owner].name;
   if(marker.dataset.owner!==ownerTag){
    marker.dataset.owner=ownerTag;
    marker.querySelector(".island-faction").textContent=ownerTag;
   }
   marker.classList.toggle("offscreen",pt.x < -1.07 || pt.x > 1.07 || pt.y < -1.07 || pt.y > 1.07);
  });
 }
 updateCamera(){
  this.center.x=THREE.MathUtils.clamp(this.center.x,-36,36);
  this.center.z=THREE.MathUtils.clamp(this.center.z,-36,36);
  this.camera.position.set(this.center.x+26,66,this.center.z+120);
  this.camera.lookAt(this.center);this.camera.updateMatrixWorld();
  this.canvas.dataset.cameraCenter=this.center.x.toFixed(3)+","+this.center.z.toFixed(3);
  this.positionMarkers();
 }
 overviewZoom(){
  if(!this.currentGame||!this.currentGame.islands.length)return .82;
  // Compute projected extent instead of assuming all randomly generated
  // islands fit a fixed portrait or landscape rectangle.
  const currentZoom=this.camera.zoom;
  this.camera.zoom=1;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  let boundX=0,boundY=0;
  for(const tile of this.currentGame.islands){
   const projected=v(tile.x,.7,tile.z).project(this.camera);
   boundX=Math.max(boundX,Math.abs(projected.x));
   boundY=Math.max(boundY,Math.abs(projected.y));
  }
  this.camera.zoom=currentZoom;this.camera.updateProjectionMatrix();
  return THREE.MathUtils.clamp(Math.min(.76/Math.max(.01,boundX),.59/Math.max(.01,boundY),.91),.17,.91);
 }
 centerView(){
  this.followPoint=null;this.center.set(0,0,0);
  this.updateCamera();
  this.scale=this.overviewZoom();
  this.resize();
 }
 viewIsland(id,zoom=1.25){
  const tile=this.currentGame?.islands[id];if(!tile)return;
  this.followPoint=null;
  this.center.set(tile.x,0,tile.z);
  this.scale=THREE.MathUtils.clamp(zoom,.17,3.45);
  this.updateCamera();this.resize();
 }

 viewPlayer(player,zoom=1.12){
  // A named player's own vessel/port is always the camera target, never the opponent.
  const p=this.currentGame?.players[player];
  if(!p||p.boat===null)return this.centerView();
  const island=this.currentGame.islands[p.boat],boat=this.boatTarget(player,p.boat);
  this.followPoint=null;
  this.center.set(island.x+(boat.x-island.x)*.33,0,island.z+(boat.z-island.z)*.33);
  this.scale=THREE.MathUtils.clamp(zoom,.17,3.45);
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
  this.scale=THREE.MathUtils.clamp(zoom,.17,3.45);
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

 showRetreatOptions(ids=[],player=null){
  this.retreatTargets=[...ids];
  for(const child of [...this.refugeMarkers.children]){
   this.refugeMarkers.remove(child);child.geometry?.dispose();child.material?.dispose();
  }
  if(!ids.length){
   this.markerNodes.forEach(node=>node.classList.remove("retreat-target"));
   return;
  }
  const color=player===1?0xffbd77:0xc3a0ff;
  for(const id of ids){
   const tile=this.currentGame.islands[id];if(!tile)continue;
   const outer=new THREE.Mesh(new THREE.TorusGeometry(2.02,.07,8,48),
     new THREE.MeshBasicMaterial({color,transparent:true,opacity:.90,depthWrite:false}));
   outer.rotation.x=-Math.PI/2;outer.position.set(tile.x,.18,tile.z);
   outer.userData.phase=id*.91;this.refugeMarkers.add(outer);
   const disk=new THREE.Mesh(new THREE.RingGeometry(1.72,2.13,48),
     new THREE.MeshBasicMaterial({color,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}));
   disk.rotation.x=-Math.PI/2;disk.position.set(tile.x,.12,tile.z);
   disk.userData.phase=id*.91+1;this.refugeMarkers.add(disk);
  }
  this.markerNodes.forEach((node,id)=>node.classList.toggle("retreat-target",ids.includes(id)));
 }
 frameIslands(ids=[]){
  if(!ids.length)return this.centerView();
  const tiles=ids.map(id=>this.currentGame.islands[id]).filter(Boolean);
  const avg=tiles.reduce((a,t)=>({x:a.x+t.x,z:a.z+t.z}),{x:0,z:0});
  this.center.set(avg.x/tiles.length,0,avg.z/tiles.length);this.updateCamera();
  this.scale=this.overviewZoom();
  if(ids.length===1)this.scale=Math.max(1.18,this.scale);
  else if(ids.length<=3)this.scale=Math.max(.62,this.scale);
  this.resize();
 }
 async upgradeEffect(id,kind="town"){
  const tile=this.currentGame.islands[id];if(!tile)return;
  const cx=kind==="ship"?this.boatTarget(this.currentGame.current,id):v(tile.x,0,tile.z);
  const hue=kind==="ship"?0xc5dcff:0xffdf97;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.06,8,40),
   new THREE.MeshBasicMaterial({color:hue,transparent:true,opacity:.72,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(cx.x,.29,cx.z);this.scene.add(ring);
  const strips=new THREE.Group();strips.position.set(cx.x,.1,cx.z);this.scene.add(strips);
  const material=new THREE.MeshBasicMaterial({color:hue,transparent:true,opacity:.78,depthWrite:false});
  for(let n=0;n<12;n++){
   const a=n*Math.PI*2/12;
   const piece=new THREE.Mesh(new THREE.BoxGeometry(.07,.6,.07),material);
   piece.position.set(Math.cos(a)*.76,.60,Math.sin(a)*.76);piece.rotation.y=a;strips.add(piece);
  }
  const start=performance.now();
  await new Promise(done=>{
   const frame=now=>{
    const t=Math.min(1,(now-start)/820);
    ring.scale.setScalar(.40+t*1.34);
    ring.material.opacity=.70*(1-t);
    strips.scale.y=.3+Math.sin(t*Math.PI)*1.6;
    strips.rotation.y=t*Math.PI*1.3;
    material.opacity=.75*(1-t);
    if(t<1)requestAnimationFrame(frame);else done();
   };requestAnimationFrame(frame);
  });
  this.scene.remove(ring,strips);ring.geometry.dispose();ring.material.dispose();
  strips.children.forEach(m=>m.geometry.dispose());material.dispose();
  this.spark(cx.x,cx.z,hue);
 }
 async expeditionEffect(id,success){
  const tile=this.currentGame?.islands[id];if(!tile)return;
  const root=new THREE.Group();root.position.set(tile.x,.38,tile.z);this.scene.add(root);
  const colors=success?[0xffe0a0,0xb1f4bd,0xfff1ca]:[0xa4d0e1,0xc9d3e3,0xe8f7fb];
  const materials=colors.map(c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.87,depthWrite:false}));
  const geometry=new THREE.IcosahedronGeometry(.088,0);
  for(let i=0;i<20;i++){
   const angle=i*Math.PI*2/20,orb=new THREE.Mesh(geometry,materials[i%3]);
   orb.position.set(Math.cos(angle)*1.72,.09+Math.sin(i*1.9)*.09,Math.sin(angle)*1.72);
   orb.userData.angle=angle;orb.userData.phase=i*.34;root.add(orb);
  }
  const start=performance.now();
  await new Promise(resolve=>{
   const tick=now=>{
    const t=Math.min(1,(now-start)/(success?1000:680));
    for(const orb of root.children){
     const angle=orb.userData.angle+t*(success?4.2:-1.8),radius=1.6+(success?.36*t:-.22*t);
     orb.position.set(Math.cos(angle)*radius,.15+Math.sin(t*Math.PI*2+orb.userData.phase)*.24+.55*t,Math.sin(angle)*radius);
     orb.scale.setScalar(Math.max(.01,1-t));
    }
    if(t>=1)resolve();else requestAnimationFrame(tick);
   };requestAnimationFrame(tick);
  });
  this.scene.remove(root);geometry.dispose();materials.forEach(m=>m.dispose());
  this.spark(tile.x,tile.z,success?0xffdca3:0xb6daec);
 }
 // Exact same offshore berth is used at spawn, after upgrades and after every voyage.
 boatTarget(player,id){
  const p=this.currentGame.players[player],pt=dockPosition(this.currentGame.islands,id,player,p.ship);
  return v(pt.x,.34,pt.z);
 }
 rebuild(game){
  this.currentGame=game;
  this.water.uniforms.islands.value=game.islands.map(t=>new THREE.Vector2(t.x,t.z));
  this.showRetreatOptions([]);
  this.markerNodes=[];
  if(this.markers){
   this.markers.replaceChildren();
   game.islands.forEach(t=>{
    const marker=document.createElement("div");
    marker.className="island-label";
    marker.innerHTML='<b>'+t.name+'</b><small class="island-faction"></small><span>🌲 '+t.wood+'&nbsp; 🪨 '+t.stone+'</span>';
    marker.setAttribute("aria-label",t.name+", "+t.wood+" bois et "+t.stone+" pierres par tour");
    marker.addEventListener("click",()=>{
     if(this.currentGame?.stage==="retreat"&&this.retreatTargets.includes(t.id))this.onIsland(t.id);
    });
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
  this.centerView();
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
    this.updateCamera();
    this.camera.zoom=this.scale;this.camera.updateProjectionMatrix();
    this.canvas.dataset.cameraZoom=this.scale.toFixed(3);
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
  for(const orb of this.refugeMarkers.children){orb.material.opacity=(orb.geometry.type==="RingGeometry"?.20:.70)+.13*Math.sin(time*3.7+orb.userData.phase);orb.rotation.z=Math.sin(time*.6)*.012}
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
