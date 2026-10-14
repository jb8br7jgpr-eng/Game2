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
 page.on("pageerror",e=>errors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")console.error("Browser:",m.text())});
 await page.goto("http://127.0.0.1:"+port,{waitUntil:"domcontentloaded",timeout:30000});
 await page.locator("#dialog.active").waitFor({timeout:45000});
 assert.ok(await page.locator("#world").isVisible(),"WebGL canvas visible");
 const gl=await page.evaluate(()=>!!document.querySelector("canvas")?.getContext("webgl2"));
 assert.ok(gl,"WebGL2 available");
 console.log("PASS: Three.js scene and mobile viewport loaded");
 mkdirSync("artifacts",{recursive:true});
 await page.screenshot({path:"artifacts/archipel-3d-mobile.png"});
 await page.getByRole("button",{name:/Découvrir l'archipel/}).click();
 await page.getByRole("button",{name:/Lancer les dés/}).click();
 await page.getByRole("button",{name:/Choisir son île/}).click();
 async function tapIsland(i){
   const rect=await page.locator(".island-label").nth(i).boundingBox();
   assert.ok(rect,"island marker exists "+i);
   await page.mouse.click(rect.x+rect.width/2,rect.y-29);
 }
 await tapIsland(4);
 await page.waitForTimeout(200);
 await tapIsland(5);
 await page.locator("#dialog.active").waitFor({timeout:10000});
 const title=await page.locator("#dialog-title").innerText();
 assert.ok(title.includes("conquête"),"start game modal after two island picks, got: "+title);
 await page.getByRole("button",{name:"Jouer"}).click();
 const current=await page.locator("#stage-name").innerText();
 assert.ok(current.startsWith("À "),"correct turn displayed");
 assert.equal(await page.locator(".island-label").count(),10);
 await page.screenshot({path:"artifacts/archipel-3d-gameplay.png"});
 assert.deepEqual(errors,[],"No uncaught JavaScript errors");
 console.log("PASS: touch a pair of 3D islands, draft, HUD, 10 resource markers, no JS errors");
}finally{await browser?.close();server.kill("SIGTERM")}
