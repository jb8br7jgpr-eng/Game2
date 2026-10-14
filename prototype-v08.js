import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {buildDiorama} from "./prototype-v08-models.js";
import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
const canvas=document.querySelector("#scene");
const $=id=>document.getElementById(id);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
let scene,renderer,camera,visuals,water;
let sun,hemi,elapsed=0,last=0;
const state={yaw:.40,pitch:.58,distance:innerWidth<700?39:31,center:V(innerWidth<700?-2.5:-1,.5,.3),fingers:new Map(),sailing:null,evening:false};
const wake=[];
const vs=[
"precision highp float;",
"uniform float uTime;",
"varying vec2 vWorld;",
"varying vec3 vNormal;",
"void main(){",
"  vec3 p=position;",
"  vec4 w=modelMatrix*vec4(p,1.);",
"  float wave1=sin(w.x*1.4+uTime*.6+sin(w.z*.93))*.035;",
"  float wave2=sin(w.z*2.2-uTime*.84+w.x*.4)*.025;",
"  float wave3=sin(w.x*.6+w.z*1.7+uTime*.34)*.048;",
"  p.y+=wave1+wave2+wave3;",
"  vWorld=w.xz;",
"  vNormal=normalize(vec3(.09*cos(w.x*1.4+uTime*.6),1.,.10*cos(w.z*2.2-uTime*.84)));",
"  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);",
"}"
].join("\n");
const fs=[
"precision highp float;",
"uniform float uTime,uSun;",
"varying vec2 vWorld;",
"varying vec3 vNormal;",
"void main(){",
" vec2 p=vWorld;",
" vec2 q=p-vec2(1.,0.);",
" float d=length(q);",
" float shallow=1.-smoothstep(3.3,9.5,d);",
" float pool=1.-smoothstep(3.3,6.5,d);",
" float swell=sin(p.x*.77+uTime*.59)*sin(p.y*.74-uTime*.54);",
" float fine=sin(p.x*7.1+uTime*1.2+sin(p.y*2.3))*sin(p.y*5.8-uTime*1.08);",
" float ribbons=sin(p.x*5.3+sin(p.y*3.7+uTime*.66))+sin(p.y*5.1-sin(p.x*4.3-uTime*.74));",
" float caustic=pow(max(0.,ribbons*.5),3.7);",
" vec3 ocean=mix(vec3(.012,.20,.37),vec3(.024,.48,.65),.33+.20*swell);",
" ocean=mix(ocean,vec3(.13,.78,.76),.85*shallow);",
" ocean+=vec3(.09,.16,.14)*caustic*(.16+.52*pool);",
" ocean+=vec3(.036,.057,.055)*(.5+.5*fine)*(.19+.25*shallow);",
" vec3 lightDirection=normalize(vec3(-.36,1.,.5));",
" float glitter=pow(max(0.,dot(reflect(-lightDirection,normalize(vNormal)),normalize(vec3(.06,.82,.45)))),15.);",
" ocean+=vec3(.31,.35,.26)*glitter*(.13+.14*abs(fine))*uSun;",
" float foam=exp(-pow((d-3.48-.045*sin(uTime*1.8+atan(q.y,q.x)*8.))/.23,2.));",
" foam*=.66+.22*sin(atan(q.y,q.x)*16.+uTime*1.8)+.10*fine;",
" ocean=mix(ocean,vec3(.95,1.,.97),clamp(foam*.83,0.,.9));",
" float alpha=mix(.97,.61,shallow);",
" alpha=mix(alpha,.97,clamp(foam,0.,1.));",
" gl_FragColor=vec4(clamp(ocean*uSun,0.,1.),alpha);",
"}"
].join("\n");
async function loadHeroAssets(){
 const loader=new GLTFLoader();
 const fetchAsset=path=>new Promise((resolve,reject)=>{
  loader.load(path,gltf=>resolve(gltf.scene),undefined,reject);
 });
 const [island,boat]=await Promise.all([
  fetchAsset("./assets/hero-island-v081.glb"),
  fetchAsset("./assets/hero-ship-v081.glb")
 ]);
 island.position.set(1,0,0);
 boat.position.set(-5.35,.18,2.75);boat.rotation.y=.14;
 island.traverse(node=>{if(node.isMesh){
  node.castShadow=true;node.receiveShadow=true;
  if(node.material){node.material.side=THREE.DoubleSide;node.material.needsUpdate=true;}
 }});
 boat.traverse(node=>{if(node.isMesh){
  node.castShadow=true;node.receiveShadow=true;
  if(node.material){node.material.side=THREE.DoubleSide;node.material.needsUpdate=true;}
 }});
 scene.add(island,boat);
 const seabed=new THREE.Mesh(new THREE.PlaneGeometry(240,240),
  new THREE.MeshStandardMaterial({color:0x2b8188,roughness:1}));
 seabed.rotation.x=-Math.PI/2;seabed.position.y=-.92;
 seabed.receiveShadow=false;scene.add(seabed);
 return {island,boat,quality:"GLB-PBR"};
}
function makeWater(){
 const g=new THREE.PlaneGeometry(240,240,100,100);g.rotateX(-Math.PI/2);
 const m=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uSun:{value:1}},vertexShader:vs,fragmentShader:fs,
  transparent:true,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(g,m);mesh.position.y=.03;mesh.renderOrder=2;scene.add(mesh);return mesh;
}
function setCamera(){
 const h=state.distance*Math.cos(state.pitch);
 camera.position.set(state.center.x+h*Math.cos(state.yaw),state.center.y+state.distance*Math.sin(state.pitch),
  state.center.z+h*Math.sin(state.yaw));
 camera.lookAt(state.center);camera.updateMatrixWorld();
}
function resize(){
 const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
 camera.aspect=w/h;camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
}
function zoom(factor){state.distance=clamp(state.distance*factor,13,48);setCamera()}
function wakeRing(x,z){
 const g=new THREE.TorusGeometry(.20,.027,6,26);
 const m=new THREE.MeshBasicMaterial({color:0xe8fff4,transparent:true,opacity:.49,depthWrite:false});
 const ring=new THREE.Mesh(g,m);ring.rotation.x=-Math.PI/2;ring.position.set(x,.06,z);ring.userData.age=0;
 wake.push(ring);scene.add(ring);
}
function sail(){
 if(state.sailing)return;
 const from=visuals.boat.position.clone();
 const end=from.x < -5.0?V(-3.96,.18,2.79):V(-5.35,.18,2.73);
 state.sailing={from,end,elapsed:0,trail:0,duration:3.0};
 $("sail").disabled=true;$("sail").textContent="⛵ Navigation en cours…";
}
function endSail(){state.sailing=null;$("sail").disabled=false;$("sail").textContent="⛵ Faire naviguer"}
function switchLighting(){
 state.evening=!state.evening;
 scene.background.setHex(state.evening?0x86a5b2:0x90d2e5);
 sun.color.setHex(state.evening?0xffbb82:0xfff6dc);
 sun.intensity=state.evening?2.0:2.75;hemi.intensity=state.evening?1.10:1.75;
 water.material.uniforms.uSun.value=state.evening?.82:1;
 $("light").textContent=state.evening?"☀ Lumière du jour":"☀ Lumière du soir";
}
function bind(){
 canvas.addEventListener("pointerdown",e=>{
  if(e.button!==0)return;e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  state.fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 });
 canvas.addEventListener("pointermove",e=>{
  const prev=state.fingers.get(e.pointerId);if(!prev)return;e.preventDefault();
  const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
  if(state.fingers.size===1){
   state.yaw+=dx*.0065;
   state.pitch=clamp(state.pitch+dy*.003,.23,1.20);
  }else if(state.fingers.size===2){
   const other=[...state.fingers].find(([id])=>id!==e.pointerId)?.[1];
   if(other){
    const was=Math.hypot(prev.x-other.x,prev.y-other.y);
    const now=Math.hypot(e.clientX-other.x,e.clientY-other.y);
    if(was>9&&now>9)zoom(was/now);
   }
  }
  state.fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});setCamera();
 });
 for(const name of ["pointerup","pointercancel","lostpointercapture"]){
  canvas.addEventListener(name,e=>state.fingers.delete(e.pointerId));
 }
 canvas.addEventListener("wheel",e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.89)},{passive:false});
 $("zoom-plus").addEventListener("click",()=>zoom(.84));
 $("zoom-minus").addEventListener("click",()=>zoom(1.17));
 $("camera-reset").addEventListener("click",()=>{
  state.yaw=.4;state.pitch=.58;state.distance=innerWidth<700?39:31;state.center.set(innerWidth<700?-2.5:-1,.5,.3);setCamera();
 });
 $("sail").addEventListener("click",sail);
 $("light").addEventListener("click",switchLighting);
 $("ui-toggle").addEventListener("click",()=>document.body.classList.add("hide-controls"));
 $("ui-restore").addEventListener("click",()=>document.body.classList.remove("hide-controls"));
 addEventListener("resize",resize);
}
function frame(timestamp){
 requestAnimationFrame(frame);
 const rawDt=Math.max(0,(timestamp-last)/1000);const dt=Math.min(.047,rawDt);last=timestamp;elapsed+=rawDt;
 if(!water)return;
 water.material.uniforms.uTime.value=elapsed;
 if(state.sailing){
  const travel=state.sailing;
  travel.elapsed=Math.min(travel.duration,travel.elapsed+rawDt);
  const t=travel.elapsed/travel.duration,e=t*t*(3-2*t);
  visuals.boat.position.lerpVectors(travel.from,travel.end,e);
  visuals.boat.position.z+=Math.sin(t*Math.PI)*.25;
  visuals.boat.rotation.y=.13+Math.sin(t*Math.PI)*.19;
  travel.trail+=dt;
  if(travel.trail>.16){travel.trail=0;wakeRing(visuals.boat.position.x-.30,visuals.boat.position.z+.40)}
  if(t>=1)endSail();
 }
 visuals.boat.position.y=.18+.061*Math.sin(elapsed*2.2);
 visuals.boat.rotation.z=.025*Math.sin(elapsed*1.4);
 visuals.boat.rotation.x=.027*Math.sin(elapsed*1.1+.8);
 for(const r of wake.slice()){
  r.userData.age+=dt;const t=r.userData.age/1.7;
  r.scale.setScalar(1+t*5);r.material.opacity=Math.max(0,.49*(1-t));
  if(t>=1){scene.remove(r);r.geometry.dispose();r.material.dispose();wake.splice(wake.indexOf(r),1)}
 }
 renderer.render(scene,camera);
}
async function init(){
 try{
  scene=new THREE.Scene();scene.background=new THREE.Color(0x90d2e5);scene.fog=new THREE.FogExp2(0x7ed3df,.0035);
  camera=new THREE.PerspectiveCamera(33,1,.1,500);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(1.55,devicePixelRatio||1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.34;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  hemi=new THREE.HemisphereLight(0xeaffff,0x79919a,1.75);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xfff6dc,2.75);sun.position.set(-12,23,16);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-15;sun.shadow.camera.right=15;
  sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;
  sun.shadow.bias=-.0002;sun.shadow.normalBias=.02;scene.add(sun);
  scene.add(new THREE.AmbientLight(0xfff4d1,.28));
  try{
    visuals=await loadHeroAssets();
   }catch(assetError){
    console.warn("GLB assets could not be loaded; using fallback art",assetError);
    visuals=buildDiorama(scene);visuals.quality="fallback";
    $("helper").textContent="Modèles haute définition indisponibles · affichage de secours";
   }
  water=makeWater();
  setCamera();resize();bind();
  $("loading").hidden=true;
  requestAnimationFrame(frame);
 }catch(e){
  console.error(e);$("loading").hidden=true;
  $("error").hidden=false;$("error").textContent="Scène 3D indisponible : "+String(e.message||e);
 }
}
init();
if(location.hostname==="localhost"||location.hostname==="127.0.0.1"){
 window.__ARCHIPEL08_TEST={getScene:()=>scene,getCamera:()=>camera,getWater:()=>water,
  getBoat:()=>visuals?.boat,getVisuals:()=>visuals,getControls:()=>state,getRenderer:()=>renderer};
}
