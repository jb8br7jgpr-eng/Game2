import {chromium} from "playwright";
import {spawn} from "node:child_process";
import {setTimeout as pause} from "node:timers/promises";
import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
const server=spawn("python3",["-m","http.server","8777","--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
 await pause(1050);
 browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.stack||e.message));
 page.on("console",e=>{if(e.type()==="error")console.log("BROWSER:",e.text())});
 await page.goto("http://127.0.0.1:8777/prototype-v08.html",{waitUntil:"domcontentloaded",timeout:30000});
 await page.locator("#loading").waitFor({state:"hidden",timeout:25000});
 assert.equal(await page.locator("#error").isVisible(),false,"no fatal error overlay");
 assert.ok(await page.evaluate(()=>Boolean(window.__ARCHIPEL08_TEST?.getRenderer()?.getContext())),"3D WebGL renderer initialized");
 assert.equal(await page.evaluate(()=>window.__ARCHIPEL08_TEST?.getVisuals()?.quality),"GLB-PBR","prebaked textured glTF models are loaded — not the old procedural fallback");
 const materialNames=await page.evaluate(()=>{
  const names=new Set(),scene=window.__ARCHIPEL08_TEST.getScene();
  scene.traverse(node=>{if(node.isMesh)for(const m of Array.isArray(node.material)?node.material:[node.material])if(m?.map)names.add(m.name)});
  return [...names];
 });
 assert.ok(materialNames.length>=6,"multiple distinct PBR image-textured materials actually rendered: "+JSON.stringify(materialNames));

 const counts=await page.evaluate(()=>{
  const t=window.__ARCHIPEL08_TEST,c=t.getScene().children;
  const info={meshes:0,lights:0,modelGroups:0,triangles:0};
  t.getScene().traverse(n=>{
   if(n.isMesh){
    info.meshes++;
    info.triangles+=(n.geometry.index?n.geometry.index.count:n.geometry.attributes.position.count)/3;
   }
   if(n.isLight)info.lights++;
   if(n.isGroup)info.modelGroups++;
  });
  return info;
 });
 // GLB merges hundreds of fine details into a few textured GPU draw calls.
 assert.ok(counts.meshes>=13&&counts.triangles>6000,
   "textured GLB has rich mesh density and efficient draw calls: "+JSON.stringify(counts));
 assert.ok(counts.lights>=3,"lighting rig present");
 mkdirSync("artifacts",{recursive:true});
 await page.screenshot({path:"artifacts/archipel-v08-iphone.png"});
 const z1=await page.evaluate(()=>window.__ARCHIPEL08_TEST.getControls().distance);
 await page.locator("#zoom-plus").click();
 const z2=await page.evaluate(()=>window.__ARCHIPEL08_TEST.getControls().distance);
 assert.ok(z2<z1,"zoom plus affects real 3D camera");
 await page.locator("#camera-reset").click();
 const z3=await page.evaluate(()=>window.__ARCHIPEL08_TEST.getControls().distance);
 assert.equal(z3,36,"iPhone recenter restores hero-shot framing for whole island and skiff");
 const duskBefore=await page.evaluate(()=>window.__ARCHIPEL08_TEST.getControls().evening);
 await page.locator("#light").click();
 assert.equal(await page.evaluate(()=>window.__ARCHIPEL08_TEST.getControls().evening),!duskBefore);
 await page.screenshot({path:"artifacts/archipel-v08-evening.png"});
 await page.locator("#light").click();
 const boat0=await page.evaluate(()=>window.__ARCHIPEL08_TEST.getBoat().position.x);
 await page.locator("#sail").click();
 await page.waitForFunction(start=>Math.abs(window.__ARCHIPEL08_TEST.getBoat().position.x-start)>.1,boat0,{timeout:12000});
 const boat1=await page.evaluate(()=>window.__ARCHIPEL08_TEST.getBoat().position.x);
 assert.ok(Math.abs(boat1-boat0)>.1,"boat navigates on a real timed route");
 await page.waitForFunction(()=>!document.getElementById("sail").disabled,null,{timeout:12000});
 assert.equal(await page.locator("#sail").isEnabled(),true,"sail control re-enabled");
 await page.locator("#ui-toggle").click();
 assert.ok(await page.locator("body").evaluate(n=>n.classList.contains("hide-controls")));
 assert.ok(await page.locator("#ui-restore").isVisible());
 await page.locator("#ui-restore").click();
 assert.ok(!await page.locator("body").evaluate(n=>n.classList.contains("hide-controls")));
 console.log("PASS: island v0.8 real WebGL, detailed geometry, lighting, mobile zoom, navigation and UI");
 assert.deepEqual(errors,[],"No uncaught JavaScript exceptions");
 await page.setViewportSize({width:1024,height:768});
 await page.locator("#camera-reset").click();
 await page.waitForTimeout(450);
 await page.screenshot({path:"artifacts/archipel-v08-landscape.png"});
}finally{
 if(browser)await browser.close();
 server.kill("SIGTERM");
}
