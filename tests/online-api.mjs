// Real server integration: exercises independent phones' bearer tokens and
// server-side game actions. No secrets or service-role credentials are used.
import assert from "node:assert/strict";
const API="https://lrmgtnbxujdvswaykyxi.supabase.co/functions/v1/archipel-online";
const KEY="sb_publishable_ppt0OwJ0f1G93qnWGUaH5w_CXOTI0VX";
async function call(action,params={},expected=200){
 const controller=new AbortController(),t=setTimeout(()=>controller.abort(),22000);
 try{
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({action,...params}),signal:controller.signal});
  const result=await r.json();
  assert.equal(r.status,expected,action+" "+JSON.stringify(result).slice(0,500));
  return result;
 }finally{clearTimeout(t)}
}
const nonce=String(Date.now()).slice(-5);
const captain0="Violet-"+nonce,captain1="Orange-"+nonce;
const start=await call("create",{name:captain0});
assert.match(start.room.code,/^[A-HJ-NP-Z2-9]{8}$/);
assert.equal(start.room.status,"waiting");assert.equal(start.room.yourSeat,0);
const {id,code}=start.room;
const host={roomId:id,token:start.token};
await call("roll",{...host,version:start.room.version},400);
const joined=await call("join",{code,name:captain1});
assert.equal(joined.room.id,id);assert.equal(joined.room.yourSeat,1);
const guest={roomId:id,token:joined.token};
const hostReady=await call("get",host);
assert.equal(hostReady.room.status,"ready");
await call("start",{...guest,version:hostReady.room.version},403);
const kickoff=await call("start",{...host,version:hostReady.room.version});
assert.equal(kickoff.room.status,"playing");
assert.deepEqual(kickoff.room.game.players.map(x=>x.name),[captain0,captain1]);
assert.equal(kickoff.room.game.stage,"roll");
assert.equal(kickoff.room.game.treasure,null,"secret treasure never disclosed to clients");
await call("roll",{...guest,version:kickoff.room.version},403);
let r=await call("roll",{...host,version:kickoff.room.version});
assert.equal(r.event.type,"roll");assert.equal(r.room.game.stage,"draft");
const firstSeat=r.room.game.chooser;
await call("choose-start",{...{roomId:id,token:firstSeat===0?joined.token:start.token},island:0,version:r.room.version},403);
r=await call("choose-start",{...(firstSeat===0?host:guest),island:0,version:r.room.version});
assert.equal(r.room.game.islands[0].owner,firstSeat);
r=await call("choose-start",{...(firstSeat===1?host:guest),island:1,version:r.room.version});
assert.equal(r.room.game.islands[1].owner,1-firstSeat);
assert.equal(r.room.game.current,1-firstSeat);
assert.equal(r.room.game.stage,"play");
const acting=r.room.game.current,actor=acting===0?host:guest,other=acting===0?guest:host;
await call("finish-turn",{...other,version:r.room.version},403);
const stale=r.room.version;
r=await call("finish-turn",{...actor,version:r.room.version});
assert.equal(r.event.type,"turn");
assert.equal(r.room.game.current,1-acting);
await call("finish-turn",{...actor,version:stale},409);
assert.equal((await call("get",guest)).room.version,r.room.version);
assert.equal((await call("get",host)).room.game.current,r.room.game.current);
console.log("PASS: two protected private seats, join code, remotely authoritative roll/draft/turn, stale-action rejection, and server synchronization");
