import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";

const port=8765;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
 await pause(850);
 browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];
 page.on("pageerror",e=>{errors.push(e.message);console.error("PAGE ERROR:",e.stack||e.message)});
 page.on("requestfailed",r=>console.error("REQUEST FAILED:",r.url(),r.failure()?.errorText));
 page.on("console",m=>{if(m.type()==="error")console.error("Browser:",m.text())});
 await page.goto("http://127.0.0.1:"+port,{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForTimeout(6000);
 console.log("INITIAL STATE",JSON.stringify(await page.evaluate(()=>({url:location.href,html:document.getElementById("actions")?.innerText,modal:document.getElementById("dialog")?.className,fallback:document.getElementById("fallback")?.innerText}))));
 mkdirSync("artifacts",{recursive:true});await page.screenshot({path:"artifacts/archipel-debug.png"});
 await page.locator("#dialog.active").waitFor({timeout:12000});
 assert.ok(await page.locator("#world").isVisible(),"WebGL canvas visible");
 const gl=await page.evaluate(()=>!!document.querySelector("canvas")?.getContext("webgl2"));
 assert.ok(gl,"WebGL2 available");
 console.log("PASS: Three.js scene and mobile viewport loaded");
 mkdirSync("artifacts",{recursive:true});
 await page.screenshot({path:"artifacts/archipel-3d-mobile.png"});
 await page.getByRole("button",{name:/Découvrir l'archipel/}).click();
 await page.getByRole("button",{name:/Lancer les dés/}).click();
 await page.locator(".dice-settled").waitFor({timeout:8000});
 const cubes=await page.locator(".die-object").count();
 assert.equal(cubes,2,"real animated 3D dice rendered for first pick");
 await page.getByRole("button",{name:/Choisir son île/}).click();
 // Draft on a larger scrollable archipelago: pick two actually visible islands.
 await page.getByRole("button",{name:"Masquer le menu d’actions"}).click();
 const areas=await page.locator(".island-label").evaluateAll(nodes=>nodes.map((node,id)=>{
  const r=node.getBoundingClientRect();return{id,x:r.x+r.width/2,y:r.y-28};
 }).filter(p=>p.y>170&&p.y<690&&p.x>45&&p.x<335));
 assert.ok(areas.length>=2,"two accessible starting islands in the current mobile view");
 await page.mouse.click(areas[0].x,areas[0].y);
 await page.waitForTimeout(170);
 await page.mouse.click(areas[1].x,areas[1].y);
 await page.locator("#dialog.active").waitFor({timeout:10000});
 const title=await page.locator("#dialog-title").innerText();
 assert.ok(title.includes("conquête"),"start game modal after two island picks, got: "+title);
 await page.getByRole("button",{name:"Jouer"}).click();
 await page.getByRole("button",{name:"Afficher le menu d’actions"}).click();
 await page.waitForFunction(()=>!document.body.classList.contains("dock-closed") &&
    getComputedStyle(document.querySelector("#action-dock")).visibility!=="hidden",{timeout:5000});
 await page.waitForTimeout(360);
 const current=(await page.locator("#stage-name").textContent())?.trim()||"";
 assert.ok(current.startsWith("Navigation • ")||current.startsWith("Action • ")||current.startsWith("Fin du tour • "),"current turn stage displayed: "+current);
 assert.equal(await page.locator(".island-label").count(),10);
 assert.equal(await page.locator(".turn-step").count(),3,"three-step turn guidance");
 assert.equal(await page.locator("body").getAttribute("data-faction")!==null,true,"active faction controls menu palette");
 
 // V0.3 camera and user-experience smoke tests use numeric camera state,
 // rather than label positions affected by Safari/WebGL frame scheduling.
 const canvas=page.locator("#world");
 const zoomStart=Number(await canvas.getAttribute("data-camera-zoom"));
 await page.getByRole("button",{name:"Zoom avant"}).click();
 const zoomed=Number(await canvas.getAttribute("data-camera-zoom"));
 assert.ok(zoomed>zoomStart,"zoom-in changes orthographic camera zoom");
 await page.getByRole("button",{name:"Zoom arrière"}).click();
 const zoomedOut=Number(await canvas.getAttribute("data-camera-zoom"));
 assert.ok(zoomedOut<zoomed,"zoom-out changes camera zoom");
 await page.getByRole("button",{name:"Recentrer la carte"}).click();
 assert.ok(Math.abs(Number(await canvas.getAttribute("data-camera-zoom"))-.80)<.015,"recenter restores initial zoom");
 const initialCenter=await canvas.getAttribute("data-camera-center");
 const canvasRect=await canvas.boundingBox();
 await page.mouse.move(canvasRect.x+canvasRect.width*.50,canvasRect.y+canvasRect.height*.49);
 await page.mouse.down();
 await page.mouse.move(canvasRect.x+canvasRect.width*.67,canvasRect.y+canvasRect.height*.56,{steps:10});
 await page.mouse.up();
 const shiftedCenter=await canvas.getAttribute("data-camera-center");
 assert.notEqual(shiftedCenter,initialCenter,"dragging pans camera to another island area");
 await page.getByRole("button",{name:"Recentrer la carte"}).click();
 assert.equal(await canvas.getAttribute("data-camera-center"),"0.000,0.000","recenter resets camera position");
 await page.getByRole("button",{name:"Masquer le menu d’actions"}).click();
 assert.ok(await page.locator("body").evaluate(x=>x.classList.contains("dock-closed")),"dock closed");
 await page.getByRole("button",{name:"Afficher le menu d’actions"}).click();
 assert.ok(!await page.locator("body").evaluate(x=>x.classList.contains("dock-closed")),"dock reopened");
 await page.getByRole("button",{name:"Masquer l’interface"}).click();
 assert.ok(await page.locator("body").evaluate(x=>x.classList.contains("map-only")),"map-only mode");
 assert.ok(await page.getByRole("button",{name:"Réafficher l’interface"}).isVisible(),"restore interface present");
 await page.screenshot({path:"artifacts/archipel-map-only.png"});
 await page.getByRole("button",{name:"Réafficher l’interface"}).click();
 assert.ok(!await page.locator("body").evaluate(x=>x.classList.contains("map-only")),"UI restored");
 await page.screenshot({path:"artifacts/archipel-3d-gameplay.png"});
 console.log("PASS: camera zoom, recenter, pan, collapsible dock and map-only restoration");
 assert.deepEqual(errors,[],"No uncaught JavaScript errors");
 console.log("PASS: touch a pair of 3D islands, draft, HUD, 10 resource markers, no JS errors");
}finally{await browser?.close();server.kill("SIGTERM")}
