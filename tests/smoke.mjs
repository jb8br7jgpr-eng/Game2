import assert from "node:assert/strict";
import fs from "node:fs";
import {newGame,makeEdges,owned,score,connected,neighborIds,rollForStart,chooseStart,
 canNavigate,canAttack,navigate,colonize,upgradeShip,upgradeIsland,attack,
 refugeOptions,retreat,finishTurn,beginTurn} from "../game.js";

function rng(seed=1143){return()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296)}
function begin(){
 const s=newGame(rng(42));
 rollForStart(s,(()=>{const rolls=[.84,.17];return()=>rolls.shift()??.38})());
 chooseStart(s,0);chooseStart(s,1);return s;
}
const s=newGame(rng(42));
assert.equal(s.islands.length,10);
assert.equal(new Set(s.islands.map(i=>i.name)).size,10);
assert.equal(s.players.length,2);
for(const i of s.islands){assert.ok(i.wood>=1&&i.wood<=3);assert.ok(i.stone>=1&&i.stone<=3)}
for(let k=0;k<10;k++){
 assert.ok(neighborIds(s,k).length>=2,"at least two routes per island");
 const seen=new Set([k]),todo=[k];
 while(todo.length)for(const x of neighborIds(s,todo.shift()))if(!seen.has(x)){seen.add(x);todo.push(x)}
 assert.equal(seen.size,10,"all ten islands connected");
}
const roll=rollForStart(s,(()=>{const x=[.92,.04];return()=>x.shift()})());
assert.equal(roll.winner,0);
chooseStart(s,0);assert.equal(s.chooser,1);
const ev=chooseStart(s,1);assert.equal(ev.type,"game-start");
assert.equal(s.stage,"play");assert.equal(s.current,1);
assert.equal(s.islands.filter(i=>i.owner===null).length,8);
assert.equal(s.islands[s.treasure].owner,null);
assert.ok(s.players[1].wood>=1&&s.players[1].stone>=1,"income first turn");
const first=s.players[1].boat;const nearby=neighborIds(s,first).find(id=>s.islands[id].owner===null);
assert.ok(nearby!==undefined,"neutral neighbor for first turn");
const moved=navigate(s,nearby);assert.equal(moved.type,"navigate");
assert.equal(s.players[1].boat,nearby);
assert.equal(s.moveUsed,true);
assert.equal(canNavigate(s,first),false);
s.treasure=-1;
const col=colonize(s);assert.equal(col.type,"colonize");assert.equal(owned(s,1).length,2);
assert.equal(score(s,1),2);
assert.equal(finishTurn(s).type,"turn");assert.equal(s.current,0);
const p=s.players[s.current];
p.wood=39;p.stone=39;beginTurn(s);assert.equal(p.wood,40);assert.equal(p.stone,40);
p.ship=1;p.wood=40;p.stone=40;
const a=upgradeShip(s);assert.equal(a.level,2);assert.equal(p.wood,30);
assert.throws(()=>upgradeIsland(s),/Action/,"only one action each turn");
beginTurn(s);
const prevWood=p.wood;const b=upgradeShip(s);assert.equal(b.level,3);assert.equal(p.wood,prevWood-20);
beginTurn(s);
const prevStone=p.stone;const c=upgradeIsland(s);assert.equal(c.level,1);assert.equal(p.stone,prevStone-10);
beginTurn(s);
const prevStone2=p.stone;assert.equal(upgradeIsland(s).level,2);assert.equal(p.stone,prevStone2-20);
assert.equal(score(s,s.current),3,"fortified island worth three points");
const a2=begin();
const attacker=a2.current,defender=1-attacker,origin=a2.players[attacker].boat;
const neighbor=neighborIds(a2,origin).find(id=>id!==a2.players[defender].boat);
assert.ok(neighbor!==undefined);
a2.islands[neighbor].owner=defender;
a2.players[defender].boat=neighbor;
assert.equal(canAttack(a2,neighbor),true);
const fight=attack(a2,neighbor,(()=>{const rolls=[.99,.0];return()=>rolls.shift()})());
assert.equal(fight.win,true);assert.equal(a2.islands[neighbor].owner,attacker);
assert.equal(a2.players[attacker].wins,1);
assert.equal(a2.stage,"retreat");
const refuges=refugeOptions(a2);
assert.ok(refuges.length);
retreat(a2,refuges[0]);assert.equal(a2.stage,"play");
assert.equal(a2.players[defender].boat,refuges[0]);
const a3=begin(),p3=a3.players[a3.current],target=neighborIds(a3,p3.boat).find(id=>id!==a3.players[1-a3.current].boat);
a3.islands[target].owner=1-a3.current;p3.ship=3;
const loss=attack(a3,target,(()=>{const rolls=[0,.9999];return()=>rolls.shift()})());
assert.equal(loss.win,false);assert.equal(p3.ship,2);assert.equal(p3.boat,a3.players[a3.current].boat);
const a4=begin();a4.players.forEach(p=>p.turns=22);a4.players[a4.current].turns=21;
assert.equal(finishTurn(a4).type,"end");assert.equal(a4.stage,"ended");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const board=fs.readFileSync(new URL("../board3d.js",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
assert.ok(html.includes('id="world"')&&html.includes('type="module"'));
assert.ok(board.includes("WebGLRenderer")&&board.includes("CylinderGeometry")&&board.includes("ShaderMaterial"));
assert.ok(css.includes("position:fixed")&&css.includes("100dvh"));
assert.ok(ui.includes("battleMotion")&&ui.includes("board.sail"));
console.log("PASS: 10 connected randomized 3D islands, start dice and drafting, turn economy, movement, capture, construction, combats, retreat, endgame, fullscreen UI and modules.");
