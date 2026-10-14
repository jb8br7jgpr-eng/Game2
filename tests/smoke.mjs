import {MIN_ISLAND_SPACING,ARCHIPEL_FORMS} from "../map-v06.js";
import {dockPosition,ISLAND_VISUAL_RADIUS} from "../docks-v06.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import {newGame,makeEdges,owned,score,connected,neighborIds,rollForStart,chooseStart,
 canNavigate,canAttack,previewAttack,navigate,colonize,previewColonization,upgradeShip,upgradeIsland,attack,
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
// Repeated seeds guard against dead ends, overlapping islands and disconnected seas.
for(let seed=1;seed<=55;seed++){
 const map=newGame(rng(seed*335));
 assert.equal(map.islands.length,10);
 for(let i=0;i<10;i++){
  const degree=neighborIds(map,i).length;
  assert.ok(degree>=2,"all islands have at least two exits, seed "+seed+", island "+i);
  assert.ok(degree<=6,"avoid excessive sea routes, seed "+seed+", island "+i);
  for(let j=i+1;j<10;j++){
   const d=Math.hypot(map.islands[i].x-map.islands[j].x,map.islands[i].z-map.islands[j].z);
   assert.ok(d>=5.04,"island spacing is at least 5.05 map units, seed "+seed);
  }
  const visited=new Set([i]),todo=[i];
  while(todo.length)for(const j of neighborIds(map,todo.pop()))if(!visited.has(j)){visited.add(j);todo.push(j)}
  assert.equal(visited.size,10,"every island remains connected, seed "+seed);
 }
 assert.ok(map.edges.length>=12&&map.edges.length<=20,"manageable sea lane count, seed "+seed);
}
// v0.6: each new archipelago spreads islands further apart and uses 5 shapes.
assert.equal(ARCHIPEL_FORMS.length,5);
const shapes=new Set();
for(let seed=1;seed<=110;seed++){
 const land=newGame(rng(seed*197));
 const positions=land.islands;
 for(let i=0;i<positions.length;i++){
  const degrees=neighborIds(land,i).length;
  assert.ok(degrees>=2,"no one-way/dead-end island, seed "+seed);
  for(let j=i+1;j<positions.length;j++){
   const d=Math.hypot(positions[i].x-positions[j].x,positions[i].z-positions[j].z);
   assert.ok(d>=MIN_ISLAND_SPACING-.011,"v0.6 spacing seed "+seed+" islands "+i+" "+j+": "+d);
  }
  for(const player of [0,1])for(const level of [1,2,3]){
   const berth=dockPosition(positions,i,player,level);
   const clearance=Math.hypot(berth.x-positions[i].x,berth.z-positions[i].z);
   assert.ok(clearance>=3.49,"boat floats outside the island at all tiers");
   assert.ok(clearance-ISLAND_VISUAL_RADIUS>1.7,"coast-and-boat bounds never intersect");
  }
 }
 const width=Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x));
 const height=Math.max(...positions.map(p=>p.z))-Math.min(...positions.map(p=>p.z));
 shapes.add(Math.round(width/height*5)/5);
}
assert.ok(shapes.size>=3,"multiple distinct archipelago silhouettes across new games");
// v0.7: each neutral island is visible with difficulty 3–5 and is not free.
for(let seed=1;seed<=95;seed++){
 const map=newGame(rng(seed*89));
 for(const tile of map.islands)assert.ok(tile.difficulty>=3&&tile.difficulty<=5);
}
const expedition=newGame(rng(94));
rollForStart(expedition,(()=>{const vals=[.96,.04];return()=>vals.shift()??.3})());
chooseStart(expedition,0);chooseStart(expedition,1);
const expOrigin=expedition.players[expedition.current].boat;
const expId=neighborIds(expedition,expOrigin).find(i=>expedition.islands[i].owner===null);
assert.ok(expId!==undefined,"neutral expedition neighbor available");
navigate(expedition,expId);
const expPreview=previewColonization(expedition);
assert.ok([3,4,5].includes(expPreview.difficulty));
assert.equal(expPreview.successPercent,Math.round(expPreview.winningSides/6*100));
const expFailure=colonize(expedition,()=>0);
assert.equal(expFailure.type,"expedition");
assert.equal(expFailure.success,false);
assert.equal(expedition.islands[expId].owner,null);
assert.equal(expedition.actionUsed,true);
assert.equal(expedition.players[expedition.current].boat,expId);
assert.throws(()=>colonize(expedition),/indisponible|impossible/i);
finishTurn(expedition);finishTurn(expedition); // the other faction plays, then retry next own turn
assert.equal(expedition.actionUsed,false);
assert.equal(expedition.players[expedition.current].boat,expId);
const expSuccess=colonize(expedition,()=>.9999);
assert.equal(expSuccess.success,true);
assert.equal(expedition.islands[expId].owner,expedition.current);
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
const col=colonize(s,()=>.99999);assert.equal(col.type,"colonize");assert.equal(owned(s,1).length,2);
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

const untouched=JSON.stringify(a2);
const forecast=previewAttack(a2,neighbor);
assert.equal(JSON.stringify(a2),untouched,"attack forecast does not roll or change state");
assert.equal(forecast.attackerRange[0],1+forecast.shipBonus);
assert.equal(forecast.defenderRange[1],6+forecast.defenseBonus);
assert.equal(forecast.defenderShipHere,true);
assert.equal(forecast.harborBonus,1);
assert.ok(forecast.winPercent>=0&&forecast.winPercent<=100);
assert.equal(forecast.totalCombos,36);

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
assert.ok(ui.includes("battleMotion")&&ui.includes("board.sail")&&ui.includes("showAttackPreview")&&ui.includes("revealTreasure"));
console.log("PASS: 10 connected randomized 3D islands, start dice and drafting, turn economy, movement, capture, construction, combats, retreat, endgame, fullscreen UI and modules.");
