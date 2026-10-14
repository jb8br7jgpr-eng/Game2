// Full end-to-end smoke test: two separately authenticated mobile browsers
// interact with the same real Supabase online room through the actual UI.
import {chromium} from "playwright";
import {spawn} from "node:child_process";
import {setTimeout as pause} from "node:timers/promises";
import {strict as assert} from "node:assert";
import {mkdirSync} from "node:fs";
const port=8766,server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
 await pause(900);
 browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
 const context=()=>browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const host=await (await context()).newPage(),guest=await (await context()).newPage();
 const errors=[];for(const [label,page] of [["host",host],["guest",guest]]){
  page.on("pageerror",e=>{errors.push(label+": "+e.message);console.error("PAGE ERROR",label,e.message)});
 }
 const origin="http://127.0.0.1:"+port+"/";
 await host.goto(origin,{waitUntil:"domcontentloaded"});
 await host.getByRole("button",{name:/Jouer à deux en ligne/}).click({timeout:18000});
 assert.ok(await host.locator("#online-create-form").isVisible(),"online creation UI visible");
 const suffix=String(Date.now()).slice(-5);
 const purple="Luna"+suffix,amber="Sol"+suffix;
 await host.locator("#online-create-name").fill(purple);
 await host.locator("#online-create-form button[type=submit]").click();
 await host.locator("#online-room-code").waitFor({state:"visible",timeout:25000});
 const code=(await host.locator("#online-room-code").innerText()).trim();
 assert.match(code,/^[A-HJ-NP-Z2-9]{8}$/);
 await guest.goto(origin+"?room="+code,{waitUntil:"domcontentloaded"});
 await guest.locator("#online-join-form").waitFor({state:"visible",timeout:18000});
 assert.equal(await guest.locator("#online-join-code").inputValue(),code);
 await guest.locator("#online-join-name").fill(amber);
 await guest.locator("#online-join-form button[type=submit]").click();
 await guest.locator("#online-room-code").waitFor({state:"visible",timeout:25000});
 await host.locator("#online-launch").waitFor({state:"visible",timeout:20000});
 assert.equal(await host.locator("#online-player-1").innerText(),amber);
 assert.equal(await guest.locator("#online-player-0").innerText(),purple);
 mkdirSync("artifacts",{recursive:true});
 await host.screenshot({path:"artifacts/archipel-online-room.png"});
 await host.locator("#online-launch").click();
 await host.locator("#online-lobby").waitFor({state:"hidden",timeout:25000});
 await guest.locator("#online-lobby").waitFor({state:"hidden",timeout:25000});
 for(const page of [host,guest]){
  await page.waitForFunction(()=>window.__ARCHIPEL_TEST?.getState()?.stage==="roll",{timeout:25000});
  assert.deepEqual(await page.evaluate(()=>window.__ARCHIPEL_TEST.getState().players.map(p=>p.name)),[purple,amber]);
 }
 assert.ok(await host.getByRole("button",{name:/Lancer les dés/}).isEnabled());
 assert.equal(await guest.getByRole("button",{name:/Lancer les dés/}).count(),0,"guest cannot roll host's dice");
 await host.getByRole("button",{name:/Lancer les dés/}).click();
 await host.locator(".dice-settled").waitFor({timeout:15000});
 assert.deepEqual(await host.locator("#dice-stage .die-player").allTextContents(),[purple,amber]);
 await guest.locator(".dice-settled").waitFor({timeout:18000});
 assert.deepEqual(await guest.locator("#dice-stage .die-player").allTextContents(),[purple,amber]);
 await host.getByRole("button",{name:/Choisir son île/}).click();
 await guest.getByRole("button",{name:"Continuer"}).click();
 const state=()=>host.evaluate(()=>window.__ARCHIPEL_TEST.getState());
 let pick= (await state()).chooser;
 for(let i=0;i<2;i++){
  const active=pick===0?host:guest;
  const island=i;
  await active.waitForFunction(([expected,stage])=>{
   const s=window.__ARCHIPEL_TEST?.getState();return s?.stage===stage&&s.chooser===expected;
  },[pick,"draft"],{timeout:16000});
  await active.getByRole("button",{name:/Voir les 10 îles/}).click();
  await active.locator(".draft-choose").first().click();
  await host.waitForFunction(i=>window.__ARCHIPEL_TEST?.getState()?.islands?.[i]?.owner!==null,island,{timeout:16000});
  await guest.waitForFunction(i=>window.__ARCHIPEL_TEST?.getState()?.islands?.[i]?.owner!==null,island,{timeout:16000});
  const h=await state(),g=await guest.evaluate(()=>window.__ARCHIPEL_TEST.getState());
  assert.equal(h.islands[island].owner,pick);
  assert.equal(g.islands[island].owner,pick);
  pick=1-pick;
 }
 for(const page of [host,guest]){
  await page.waitForFunction(()=>window.__ARCHIPEL_TEST?.getState()?.stage==="play",{timeout:18000});
 }
 // The second chooser sees the opening announcement and confirms it.
 const finalPicker=pick===0?guest:host;
 const playButton=finalPicker.getByRole("button",{name:"Jouer"});
 if(await playButton.isVisible().catch(()=>false))await playButton.click();
 await host.waitForTimeout(250);
 const playing=await state();
 assert.equal(playing.current,playing.players[0].boat===null?0:1-(playing.islands.find(i=>i.owner===0)?.id===0?0:1),"current player is the second chooser");
 const acting=playing.current===0?host:guest,waiting=playing.current===0?guest:host;
 assert.equal(await waiting.getByRole("button",{name:/Passer \/ finir le tour/}).count(),0,"inactive phone cannot end current turn");
 await acting.getByRole("button",{name:/Passer \/ finir le tour/}).click();
 await acting.getByRole("button",{name:"Commencer le tour"}).click();
 await waiting.waitForFunction(prior=>window.__ARCHIPEL_TEST?.getState()?.current===1-prior,playing.current,{timeout:20000});
 assert.equal(await waiting.evaluate(()=>window.__ARCHIPEL_TEST.getState().current),1-playing.current);
 const cam=await waiting.evaluate(()=>{
  const T=window.__ARCHIPEL_TEST,s=T.getState(),b=T.getBoard();
  const isle=s.islands[s.players[s.current].boat],ship=b.boatTarget(s.current,isle.id);
  return Math.hypot(b.center.x-isle.x-(ship.x-isle.x)*.33,b.center.z-isle.z-(ship.z-isle.z)*.33);
 });
 assert.ok(cam<.15,"camera follows next player after synced handoff: "+cam);
 await host.screenshot({path:"artifacts/archipel-online-gameplay.png"});
 // A phone refresh must recover its room, private seat and latest turn.
 await acting.reload({waitUntil:"domcontentloaded"});
 await acting.waitForFunction(()=>{
  const t=window.__ARCHIPEL_TEST;
  return t?.getState()?.stage==="play"&&document.getElementById("online-lobby")?.hidden===true;
 },{timeout:25000});
 assert.deepEqual(await acting.evaluate(()=>window.__ARCHIPEL_TEST.getState().players.map(p=>p.name)),[purple,amber],
  "reloaded phone reconnects to the same two named factions");
 assert.equal(await acting.evaluate(()=>window.__ARCHIPEL_TEST.getState().current),1-playing.current,
  "reconnected phone receives the latest authoritative turn");
 assert.deepEqual(errors,[],"Both mobile browsers have no JavaScript exceptions");
 console.log("PASS: true 2-iPhone GUI multiplayer room, invitation URL, both dice, synced drafting, guarded turns and camera follow");
}finally{await browser?.close();server.kill("SIGTERM")}