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
 await page.locator("#welcome").waitFor({state:"visible",timeout:12000});
 assert.ok(await page.locator(".welcome-logo").evaluate(img=>img.complete&&img.naturalWidth>0),"vector game logo loads");
 assert.equal(await page.locator("#player-name-0").inputValue(),"Vélyra");
 assert.equal(await page.locator("#player-name-1").inputValue(),"Auréon");
 assert.ok(await page.locator("#world").isVisible(),"WebGL canvas visible");
 const gl=await page.evaluate(()=>!!document.querySelector("canvas")?.getContext("webgl2"));
 assert.ok(gl,"WebGL2 available");
 console.log("PASS: Three.js scene and mobile viewport loaded");
 mkdirSync("artifacts",{recursive:true});
 await page.screenshot({path:"artifacts/archipel-3d-mobile.png"});
 await page.locator("#player-name-0").fill("Lunaria");
 await page.locator("#player-name-1").fill("Solaria");
 await page.locator("#start-game").click();
 assert.equal(await page.locator("#welcome").isVisible(),false,"launch button closes welcome");
 assert.deepEqual(await page.evaluate(()=>window.__ARCHIPEL_TEST.getState().players.map(p=>p.name)),["Lunaria","Solaria"]);
 assert.equal(await page.locator("#team-0 .team-title").innerText(),"Lunaria");
 assert.equal(await page.locator("#team-1 .team-title").innerText(),"Solaria");
 await page.getByRole("button",{name:/Lancer les dés/}).click();
 await page.locator(".dice-settled").waitFor({timeout:8000});
 const cubes=await page.locator(".die-object").count();
 assert.equal(cubes,2,"real animated 3D dice rendered for first pick");
 assert.deepEqual(await page.locator("#dice-stage .die-player").allTextContents(),
  ["Lunaria","Solaria"],"starting dice show configured names in purple/orange order");
 await page.getByRole("button",{name:/Choisir son île/}).click();
 // V0.6: wide irregular archipelago needs reliable, accessible island selection.
 await page.getByRole("button",{name:/Voir les 10 îles/}).click();
 assert.equal(await page.locator(".draft-island-card").count(),10,"all ten draft islands listed with income");
 const firstIncome=await page.locator(".draft-island-resources").first().innerText();
 assert.ok(firstIncome.includes("bois")&&firstIncome.includes("pierre"),"draft income readable");
 await page.locator(".draft-view").first().click();
 assert.equal(await page.locator("#dialog.active").count(),0,"viewing an island closes catalog");
 const observedCenter=await page.locator("#world").getAttribute("data-camera-center");
 assert.notEqual(observedCenter,"0.000,0.000","3D island scouting pans camera");
 await page.getByRole("button",{name:/Voir les 10 îles/}).click();
 await page.locator(".draft-choose").first().click();
 const firstOwner=await page.evaluate(()=>{const s=window.__ARCHIPEL_TEST.getState();return {owner:s.islands[0].owner,firstChooser:s.firstChooser};});
 assert.equal(firstOwner.owner,firstOwner.firstChooser,"first-selected island belongs to correct dice winner");
 assert.ok(await page.locator(".island-label").nth(0).evaluate((n,owner)=>n.classList.contains(owner===0?"violet":"orange"),firstOwner.owner),"first claimed island shows its actual faction color");
 assert.ok((await page.locator(".island-label").nth(0).locator(".island-faction").innerText()).includes(firstOwner.owner===0?"Lunaria":"Solaria"),"owner name shown on island");
 await page.getByRole("button",{name:/Voir les 10 îles/}).click();
 assert.equal(await page.locator(".draft-island-card").count(),9,"claimed island absent from second choice");
 await page.locator(".draft-choose").first().click();
 await page.locator("#dialog.active").waitFor({timeout:10000});
 const title=await page.locator("#dialog-title").innerText();
 assert.ok(title.includes("conquête"),"start game modal after two island picks, got: "+title);
 await page.getByRole("button",{name:"Jouer"}).click();
 const initialFocus=await page.evaluate(()=>{
  const t=window.__ARCHIPEL_TEST,s=t.getState(),b=t.getBoard(),who=s.current;
  const i=s.islands[s.players[who].boat],boat=b.boatTarget(who,i.id);
  return {dx:Math.abs(b.center.x-i.x-(boat.x-i.x)*.33),dz:Math.abs(b.center.z-i.z-(boat.z-i.z)*.33)};
 });
 assert.ok(initialFocus.dx<.08&&initialFocus.dz<.08,"start camera follows the first active faction "+JSON.stringify(initialFocus));
 assert.equal(await page.locator(".island-label.violet").count(),1);
 assert.equal(await page.locator(".island-label.orange").count(),1);
 await page.waitForTimeout(250);
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
 const expectedOverview=await page.evaluate(()=>window.__ARCHIPEL_TEST.getBoard().overviewZoom());
 assert.ok(Math.abs(Number(await canvas.getAttribute("data-camera-zoom"))-expectedOverview)<.015,"recenter fits entire irregular archipelago");
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
 const oldCurrent=await page.evaluate(()=>window.__ARCHIPEL_TEST.getState().current);
 await page.getByRole("button",{name:/Passer \/ finir le tour/}).click();
 await page.getByRole("button",{name:"Commencer le tour"}).click();
 const nextFocus=await page.evaluate(()=>{
  const t=window.__ARCHIPEL_TEST,s=t.getState(),b=t.getBoard(),who=s.current;
  const i=s.islands[s.players[who].boat],boat=b.boatTarget(who,i.id);
  return {current:who,dx:Math.abs(b.center.x-i.x-(boat.x-i.x)*.33),dz:Math.abs(b.center.z-i.z-(boat.z-i.z)*.33)};
 });
 assert.equal(nextFocus.current,1-oldCurrent,"other faction takes next turn");
 assert.ok(nextFocus.dx<.08&&nextFocus.dz<.08,"camera follows the current faction after end-turn "+JSON.stringify(nextFocus));
 // v0.5 tactical confirmation: cancel is safe, accepting actually rolls.
 const target=await page.evaluate(()=>{
  const T=window.__ARCHIPEL_TEST,s=T.getState(),from=s.players[s.current].boat;
  const edge=s.edges.find(e=>e.includes(from));const id=edge[0]===from?edge[1]:edge[0];
  s.islands[id].owner=1-s.current;
  T.refresh();T.showAttackPreview(id);
  return id;
 });
 await page.locator(".attack-forecast").waitFor({timeout:6000});
 assert.ok(await page.locator(".forecast-teams").isVisible(),"attack sides and bonuses visible");
 const forecastText=await page.locator(".attack-forecast").innerText();
 assert.ok(forecastText.includes("Force possible")&&forecastText.includes("sur 36"),"odds and dice force ranges visible");
 const untouched=await page.evaluate(()=>JSON.stringify(window.__ARCHIPEL_TEST.getState()));
 await page.getByRole("button",{name:"Annuler"}).click();
 const cancelled=await page.evaluate(()=>JSON.stringify(window.__ARCHIPEL_TEST.getState()));
 assert.equal(cancelled,untouched,"cancel does not touch state nor spend action");
 await page.evaluate(id=>window.__ARCHIPEL_TEST.showAttackPreview(id),target);
 await page.getByRole("button",{name:/Attaquer !/}).click();
 await page.locator(".dice-settled").waitFor({timeout:18000});
 assert.ok(await page.locator(".battle-scores").isVisible(),"actual battle dice and result presented");
 const combatants=await page.evaluate(()=>{
   const s=window.__ARCHIPEL_TEST.getState();
   return [s.players[s.current].name,s.players[1-s.current].name];
 });
 assert.deepEqual(await page.locator("#dice-stage .die-player").allTextContents(),
  combatants,"battle dice labels follow attacker and defender, including reversed faction order");
 const spent=await page.evaluate(()=>window.__ARCHIPEL_TEST.getState().actionUsed);
 assert.equal(spent,true,"confirmed attack consumes exactly one action");
 console.log("PASS: attack preview, accurate forces, cancel without mutation, confirmed dice combat");
 // V0.7: defensive retreat is selected from luminous islands, not name-only buttons.
 await page.evaluate(()=>{
  document.getElementById("dialog").classList.remove("active");
  const T=window.__ARCHIPEL_TEST,s=T.getState();
  s.stage="retreat";s.actionUsed=true;s.moveUsed=true;
  T.refresh();T.pickRefuge();
 });
 const highlighted=page.locator(".island-label.retreat-target");
 await highlighted.first().waitFor({timeout:7000});
 assert.ok(await highlighted.count()>=1,"eligible retreat islands glow");
 const markers=await page.evaluate(()=>window.__ARCHIPEL_TEST.getBoard().refugeMarkers.children.length);
 assert.ok(markers>=2,"3D luminous circles mark available destinations");
 await highlighted.first().click({timeout:7000});
 await page.getByRole("heading",{name:/Repli vers/}).waitFor({timeout:7000});
 await page.getByRole("button",{name:/Confirmer le refuge/}).click();
 await page.waitForFunction(()=>window.__ARCHIPEL_TEST.getState().stage==="play",{timeout:7000});
 assert.equal(await page.locator(".island-label.retreat-target").count(),0,"highlight removed after confirmed retreat");
 console.log("PASS: glowing map-based retreat, tap confirmation and animated refuge");
 // V0.7: failure consumes action and an unsuccessful roll cannot found a village.
 await page.evaluate(()=>{
  const T=window.__ARCHIPEL_TEST,s=T.getState();
  const tile=s.islands.find(i=>i.owner===null);
  s.stage="play";s.actionUsed=false;s.moveUsed=false;s.players[s.current].boat=tile.id;
  s.selected=tile.id;tile.difficulty=5;
  window.__failedOriginalRandom=Math.random;Math.random=()=>0;T.refresh();
 });
 await page.evaluate(()=>window.__ARCHIPEL_TEST.doColonize());
 await page.getByRole("heading",{name:/Expédition repoussée/}).waitFor({timeout:25000});
 const expeditionName=await page.evaluate(()=>{
  const s=window.__ARCHIPEL_TEST.getState();return s.players[s.current].name;
 });
 assert.deepEqual(await page.locator("#dice-stage .die-player").allTextContents(),
  [expeditionName],"single expedition die shows its actual captain name");
 assert.equal(await page.evaluate(()=>window.__ARCHIPEL_TEST.getState().actionUsed),true);
 assert.ok(await page.evaluate(()=>{
  const s=window.__ARCHIPEL_TEST.getState();return s.islands[s.players[s.current].boat].owner===null;
 }),"island remains neutral after failed scouting");
 await page.getByRole("button",{name:/Terminer ce tour/}).click();
 await page.evaluate(()=>{Math.random=window.__failedOriginalRandom});
 console.log("PASS: failed expedition dice preserve neutral island and spend action");
 // V0.6 treasure: force a neutral discovery, verify animated 3D chest & exact gift.
 await page.evaluate(()=>{
  document.getElementById("dialog").classList.remove("active");
  const T=window.__ARCHIPEL_TEST,s=T.getState();
  const island=s.islands.find(i=>i.owner===null);
  if(!island)throw Error("no neutral island available for treasure test");
  s.stage="play";s.actionUsed=false;s.moveUsed=false;s.selected=island.id;
  s.players[s.current].boat=island.id;
  s.treasure=island.id;s.treasureFound=false;
  window.__treasureOriginalRandom=Math.random;
  let rollNumber=0; Math.random=()=>++rollNumber===1?.9999:0; // succeed on the die, then choose cargo
  T.refresh();
 });
 // The neutral island can be attempted only with its visible difficulty.
 const preview=await page.evaluate(()=>window.__ARCHIPEL_TEST.getState().islands.find(i=>i.owner===null)?.difficulty);
 assert.ok(preview>=3&&preview<=5);
 await page.evaluate(()=>window.__ARCHIPEL_TEST.doColonize());
 await page.getByRole("heading",{name:/Trésor découvert sur/}).waitFor({timeout:14000});
 assert.ok(await page.locator(".treasure-reveal.cargo").isVisible(),"specific treasure type and card are visible");
 const reward=await page.locator(".treasure-reveal").innerText();
 assert.ok(reward.includes("bois")&&reward.includes("pierre"),"player can identify exact wood/stone reward");
 assert.ok(await page.getByRole("button",{name:/Récupérer mon trésor/}).isVisible(),"treasure remains visible until manually confirmed");
 await page.screenshot({path:"artifacts/archipel-v06-treasure.png"});
 const discovery=await page.evaluate(()=>window.__ARCHIPEL_TEST.getState().treasureFound);
 assert.equal(discovery,true,"treasure was collected exactly once");
 await page.getByRole("button",{name:/Récupérer mon trésor/}).click();
 await page.evaluate(()=>{Math.random=window.__treasureOriginalRandom});
 console.log("PASS: island treasure animated and clear reward collected manually");
 assert.deepEqual(errors,[],"No uncaught JavaScript errors");
 console.log("PASS: touch a pair of 3D islands, draft, HUD, 10 resource markers, no JS errors");
}finally{await browser?.close();server.kill("SIGTERM")}
