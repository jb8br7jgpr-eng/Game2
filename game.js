// ARCHIPEL 0.2 — deterministic rule engine, independent from rendering.
export const FACTIONS=[
  {name:"Vélyra",short:"V",color:0x8655cf,light:"#b59cf6",flag:"#8250c5"},
  {name:"Auréon",short:"A",color:0xf18b35,light:"#ffc48e",flag:"#ed8431"}
];
export const ISLANDS=[
  ["Nacréa","coast"],["Élyndra","waterfall"],["Miralys","flower"],["Thaloria","coral"],
  ["Calyssé","ruins"],["Orémis","cliff"],["Syléora","forest"],["Valcéria","volcano"],
  ["Iskaria","arch"],["Ondélys","mist"]
];
// Natural placement: Poisson-disc inspired sampling in an oval archipelago.
const FALLBACK=[[-4.5,-6.4],[.1,-7.4],[4.6,-5.8],[-2.5,-3.3],[3.3,-2.0],[-4.6,.1],[.1,1.0],[4.7,2.2],[-2.8,5.4],[2.5,7.1]];
export function makePositions(rng=Math.random){
 const points=[];
 for(let tries=0;tries<5000&&points.length<10;tries++){
  const a=rng()*Math.PI*2,r=Math.sqrt(rng());
  const x=Math.cos(a)*r*5.85,z=Math.sin(a)*r*7.65;
  if(points.every(p=>Math.hypot(p[0]-x,p[1]-z)>=3.25))points.push([x,z]);
 }
 // On the very rare failed sample, use an irregular seeded formation.
 if(points.length<10)return FALLBACK.map(p=>[p[0]+(rng()-.5)*.8,p[1]+(rng()-.5)*.8]);
 return points;
}
function mix(a,rng=Math.random){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
const dice=(rng)=>1+Math.floor(rng()*6);
export function makeEdges(tiles){
 const lengths=[];
 for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++){
  lengths.push({i,j,d:Math.hypot(tiles[i].x-tiles[j].x,tiles[i].z-tiles[j].z)});
 }
 lengths.sort((a,b)=>a.d-b.d);
 const edges=[],used=new Set([0]);
 const has=(i,j)=>edges.some(e=>e[0]===i&&e[1]===j||e[0]===j&&e[1]===i);
 const degree=i=>edges.filter(e=>e.includes(i)).length;
 const crosses=(a,b)=>{
  const A=tiles[a.i],B=tiles[a.j],C=tiles[b[0]],D=tiles[b[1]];
  if(a.i===b[0]||a.i===b[1]||a.j===b[0]||a.j===b[1])return false;
  const cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
  return cross(A,B,C)*cross(A,B,D)<0&&cross(C,D,A)*cross(C,D,B)<0;
 };
 // Connect every island, then introduce alternate routes without a grid layout.
 while(used.size<tiles.length){
  const e=lengths.find(e=>used.has(e.i)!==used.has(e.j));
  if(!e)break;edges.push([e.i,e.j]);used.add(e.i);used.add(e.j);
 }
 for(let pass=0;pass<2;pass++){
  for(let i=0;i<tiles.length;i++){
   while(degree(i)<3){
    const e=lengths.find(e=>(e.i===i||e.j===i)&&!has(e.i,e.j)&&
      degree(e.i)<6&&degree(e.j)<6&&(!pass?edges.every(b=>!crosses(e,b)):true));
    if(!e)break;edges.push([e.i,e.j]);
   }
  }
 }
 // 18–21 connections, balancing tactical choices and legible sea lanes.
 for(const allowCross of [false,true]){
  for(const e of lengths){
   if(edges.length>=20)break;
   if(has(e.i,e.j)||degree(e.i)>=5||degree(e.j)>=5)continue;
   if(!allowCross&&edges.some(b=>crosses(e,b)))continue;
   edges.push([e.i,e.j]);
  }
 }
 return edges;
}
export function newGame(rng=Math.random){
  const places=mix(makePositions(rng),rng);
  const islands=ISLANDS.map(([name,theme],i)=>({
    id:i,name,theme,x:places[i][0],z:places[i][1],
    wood:1+Math.floor(rng()*3),stone:1+Math.floor(rng()*3),owner:null,level:0
  }));
  return {
    stage:"roll",islands,edges:makeEdges(islands),
    players:FACTIONS.map(f=>({name:f.name,wood:0,stone:0,ship:1,boat:null,wins:0,turns:0})),
    roll:null,firstChooser:null,chooser:null,selected:null,current:null,moveUsed:false,actionUsed:false,
    event:null,treasure:null,treasureFound:false,winner:null,winReason:null,serial:0
  };
}
export const connected=(s,a,b)=>s.edges.some(e=>e[0]===a&&e[1]===b||e[0]===b&&e[1]===a);
export const owned=(s,p)=>s.islands.filter(i=>i.owner===p);
export const score=(s,p)=>owned(s,p).reduce((n,i)=>n+1+i.level,0);
export const neighborIds=(s,i)=>s.edges.filter(e=>e.includes(i)).map(e=>e[0]===i?e[1]:e[0]);
export function rollForStart(s,rng=Math.random){
  if(s.stage!=="roll")throw Error("Les dés ont déjà été lancés.");
  let a,b;do{a=dice(rng);b=dice(rng)}while(a===b);
  s.roll=[a,b];s.firstChooser=a>b?0:1;s.chooser=s.firstChooser;s.stage="draft";s.serial++;
  return {type:"roll",dice:[a,b],winner:s.firstChooser};
}
export function chooseStart(s,id){
  if(s.stage!=="draft"||s.chooser===null)throw Error("Ce n'est pas le moment de choisir une île.");
  const island=s.islands[id];if(!island||island.owner!==null)throw Error("Choisis une île encore libre.");
  island.owner=s.chooser;s.players[s.chooser].boat=id;s.selected=id;
  const chooser=s.chooser;s.serial++;
  if(s.players.every(p=>p.boat!==null)){
    const neutral=s.islands.filter(i=>i.owner===null);
    s.treasure=neutral[Math.floor(Math.random()*neutral.length)].id;
    s.current=1-s.firstChooser;s.chooser=null;s.stage="play";beginTurn(s);
    return {type:"game-start",player:s.current};
  }
  s.chooser=1-chooser;
  return {type:"chosen",player:chooser,island:id,next:s.chooser};
}
export function beginTurn(s){
  if(s.stage!=="play")return;
  const p=s.players[s.current],income=owned(s,s.current).reduce((v,i)=>({wood:v.wood+i.wood,stone:v.stone+i.stone}),{wood:0,stone:0});
  p.wood=Math.min(40,p.wood+income.wood);p.stone=Math.min(40,p.stone+income.stone);
  s.moveUsed=false;s.actionUsed=false;s.selected=p.boat;s.event=null;s.serial++;
  return {type:"income",...income};
}
export function canNavigate(s,id){
  if(s.stage!=="play"||s.moveUsed||s.actionUsed)return false;
  const p=s.players[s.current];
  return id!==p.boat&&connected(s,p.boat,id)&&s.islands[id].owner!==1-s.current;
}
export function canAttack(s,id){
  if(s.stage!=="play"||s.moveUsed||s.actionUsed)return false;
  const p=s.players[s.current];
  return id!==p.boat&&connected(s,p.boat,id)&&s.islands[id].owner===1-s.current;
}
export function navigate(s,id){
  if(!canNavigate(s,id))throw Error("Destination inaccessible : utilise une route directe et évite les îles ennemies.");
  const from=s.players[s.current].boat;
  s.players[s.current].boat=id;s.moveUsed=true;s.selected=id;s.serial++;
  return {type:"navigate",from,to:id,player:s.current};
}
function advanceIfWin(s){
  if(owned(s,s.current).length>=7){s.winner=s.current;s.winReason="domination";s.stage="ended";return true}
  return false;
}
export function colonize(s,rng=Math.random){
  const p=s.players[s.current],tile=s.islands[p.boat];
  if(s.stage!=="play"||s.actionUsed||tile.owner!==null)throw Error("Colonisation impossible.");
  tile.owner=s.current;s.actionUsed=true;s.serial++;
  const won=advanceIfWin(s);
  if(won)return {type:"end",reason:"domination",winner:s.winner};
  if(!s.treasureFound&&tile.id===s.treasure){
    s.treasureFound=true;
    const options=["cargo"];
    if(p.ship<3)options.push("ship");if(tile.level<2)options.push("fort");
    const gift=options[Math.floor(rng()*options.length)];
    if(gift==="cargo"){p.wood=Math.min(40,p.wood+10);p.stone=Math.min(40,p.stone+10)}
    else if(gift==="ship")p.ship++;
    else tile.level++;
    return {type:"treasure",island:tile.id,gift,player:s.current};
  }
  return {type:"colonize",island:tile.id,player:s.current};
}
export function upgradeShip(s){
  if(s.stage!=="play"||s.actionUsed)throw Error("Action indisponible.");
  const p=s.players[s.current],tile=s.islands[p.boat],cost=p.ship===1?10:20;
  if(tile.owner!==s.current)throw Error("Ton navire doit être dans un port allié.");
  if(p.ship>=3||p.wood<cost)throw Error("Bois insuffisant ou navire déjà au maximum.");
  p.wood-=cost;p.ship++;s.actionUsed=true;s.serial++;
  return {type:"ship",player:s.current,level:p.ship,cost};
}
export function upgradeIsland(s){
  if(s.stage!=="play"||s.actionUsed)throw Error("Action indisponible.");
  const p=s.players[s.current],tile=s.islands[p.boat],cost=tile.level===0?10:20;
  if(tile.owner!==s.current)throw Error("Tu dois être sur l'île alliée à développer.");
  if(tile.level>=2||p.stone<cost)throw Error("Pierre insuffisante ou fortifications au maximum.");
  p.stone-=cost;tile.level++;s.actionUsed=true;s.serial++;
  return {type:"build",island:tile.id,level:tile.level,cost};
}
export function attack(s,id,rng=Math.random){
  if(!canAttack(s,id))throw Error("Attaque impossible depuis cette position.");
  const p=s.players[s.current],defender=1-s.current,tile=s.islands[id];
  const attackerDice=dice(rng),defenderDice=dice(rng),
    attackerTotal=attackerDice+p.ship-1,
    defenderTotal=defenderDice+tile.level+(s.players[defender].boat===id?1:0);
  const win=attackerTotal>defenderTotal;
  const from=p.boat;
  s.moveUsed=true;s.actionUsed=true;s.selected=id;
  if(win){
    tile.owner=s.current;tile.level=Math.max(0,tile.level-1);p.boat=id;p.wins++;
    if(advanceIfWin(s))s.event={type:"end",winner:s.winner};
    else if(s.players[defender].boat===id)s.stage="retreat";
  }else p.ship=Math.max(1,p.ship-1);
  s.serial++;
  return {type:"battle",attacker:s.current,defender,attackerDice,defenderDice,
    attackerTotal,defenderTotal,win,from,to:id,defenderOnIsland:s.players[defender].boat===id,
    domination:s.stage==="ended"};
}
export function refugeOptions(s){
  if(s.stage!=="retreat")return [];
  const defender=1-s.current,allied=owned(s,defender);
  return (allied.length?allied:s.islands.filter(i=>i.owner===null)).map(i=>i.id);
}
export function retreat(s,id){
  if(!refugeOptions(s).includes(id))throw Error("Refuge indisponible.");
  const defender=1-s.current,from=s.players[defender].boat;
  s.players[defender].boat=id;s.stage="play";s.serial++;
  return {type:"retreat",from,to:id,player:defender};
}
export function standings(s){
  const scores=[score(s,0),score(s,1)],islands=[owned(s,0).length,owned(s,1).length],battles=s.players.map(p=>p.wins);
  for(const [a,b] of [[scores[0],scores[1]],[islands[0],islands[1]],[battles[0],battles[1]]]){
    if(a!==b)return a>b?0:1;
  }
  return null;
}
export function finishTurn(s){
  if(s.stage!=="play")throw Error("Termine d'abord la retraite.");
  s.players[s.current].turns++;
  if(s.players.every(p=>p.turns>=22)){
    s.winner=standings(s);s.winReason="points";s.stage="ended";s.serial++;
    return {type:"end",reason:"points",winner:s.winner};
  }
  s.current=1-s.current;
  if(s.players[s.current].turns>=22)s.current=1-s.current;
  const income=beginTurn(s);
  return {type:"turn",player:s.current,income};
}
