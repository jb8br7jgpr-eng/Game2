import {
 FACTIONS,newGame,connected,owned,score,rollForStart,chooseStart,
 beginTurn,canNavigate,canAttack,navigate,colonize,upgradeShip,upgradeIsland,
 attack,refugeOptions,retreat,finishTurn
} from "./game.js";
import {Board3D} from "./board3d.js";
const $=id=>document.getElementById(id);
let state=newGame(),locked=false;
const ICONS={Vélyra:"☾",Auréon:"☀"};
const alertBox=$("toast");
const dialog=$("dialog"),dialogTitle=$("dialog-title"),dialogText=$("dialog-text"),
 dialogIcon=$("dialog-icon"),dialogButtons=$("dialog-buttons"),dialogSpecial=$("dialog-special");
function toast(message){
 alertBox.textContent=message;alertBox.classList.add("show");
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>alertBox.classList.remove("show"),2600);
}
function modal({icon="🏝️",title,text,buttons=[],special=""}){
 dialogIcon.textContent=icon;dialogTitle.textContent=title;dialogText.textContent=text||"";
 dialogButtons.replaceChildren();dialogSpecial.innerHTML=special;
 for(const option of buttons){
  const b=document.createElement("button");
  b.type="button";b.className="dialog-button "+(option.secondary?"alt":"");b.textContent=option.label;
  b.addEventListener("click",()=>{dialog.classList.remove("active");option.click?.()});
  dialogButtons.appendChild(b);
 }
 dialog.classList.add("active");
}
const player=()=>state.players[state.current];
const currentIsland=()=>state.islands[player()?.boat];
const name=i=>FACTIONS[i]?.name||"";
const panelText={
 roll:"Un lancer de dés décide qui choisit son île en premier.",
 draft:"Touchez l'île sur laquelle votre faction souhaite commencer.",
 play:"Navigue par les routes lumineuses, puis utilise une action.",
 ended:"La partie est terminée. Lance une revanche !"
};
function button(text,func,enabled=true,skin=""){
 const b=document.createElement("button");
 b.className="action "+skin;b.type="button";b.disabled=!enabled;b.innerHTML=text;
 b.addEventListener("click",()=>{if(!locked)func()});return b;
}
function updateHud(){
 const stage=state.stage;
 $("round").textContent=stage==="play"||stage==="retreat"?"TOUR "+Math.min(22,player().turns+1)+" / 22":stage==="ended"?"PARTIE TERMINÉE":"PRÉPARATION";
 state.players.forEach((p,i)=>{
  const node=$("team-"+i),active=(stage==="play"&&state.current===i)||(stage==="draft"&&state.chooser===i);
  node.classList.toggle("active",active);node.classList.toggle("orange",i===1);
  node.querySelector(".team-count").textContent=owned(state,i).length+" îles • "+score(state,i)+" pts";
  node.querySelector(".team-ship").textContent="⛵ "+p.ship+"  ⚔ "+p.wins;
  node.querySelector(".team-wood").textContent=p.wood;
  node.querySelector(".team-stone").textContent=p.stone;
 });
 const caption=$("status-line"),stageName=$("stage-name"),guide=$("guide");
 if(stage==="roll"){stageName.textContent="Le choix des îles";caption.textContent="Deux royaumes. Un archipel.";guide.textContent="Lancez les dés pour commencer."}
 if(stage==="draft"){stageName.textContent=name(state.chooser)+" choisit son île";caption.textContent="Touchez une île libre.";guide.textContent="Les ressources sont visibles pour chaque île."}
 if(stage==="play"){
  const p=player(),tile=currentIsland();
  stageName.textContent="À "+p.name+" de jouer";
  caption.textContent=(state.moveUsed?"⛵ Navigation effectuée":"⛵ 1 déplacement disponible")+"  ·  "+(state.actionUsed?"✓ Action utilisée":"✦ 1 action disponible");
  guide.textContent=tile?.owner===null?"Île neutre : colonise-la !":!state.moveUsed?"Touchez une île reliée pour naviguer, ou sélectionnez une île ennemie.":"Choisis ton action ou termine ton tour.";
 }
 if(stage==="retreat"){stageName.textContent="Retraite !";caption.textContent="Choisis un refuge pour le défenseur.";guide.textContent="Le navire ne perd aucun niveau."}
 if(stage==="ended"){stageName.textContent=state.winner===null?"Match nul":name(state.winner)+" remporte la partie";caption.textContent="L'archipel attend une revanche.";guide.textContent="Partie terminée."}
 const tile=state.selected===null?null:state.islands[state.selected];
 $("island-detail").classList.toggle("empty",!tile);
 $("island-detail").innerHTML=tile?
  '<div class="tile-name">'+escapeHTML(tile.name)+'</div><span class="tile-owner">'+(tile.owner===null?"Île neutre":name(tile.owner))+(tile.owner===null?"":" · "+["Village","Ville","Ville fortifiée"][tile.level])+'</span><span class="tile-income">🌲 +'+tile.wood+' &nbsp; 🪨 +'+tile.stone+'</span>'
  :'<span class="tile-name">L’archipel</span><span class="tile-owner">10 îles à explorer</span>';
 const actions=$("actions");actions.replaceChildren();
 if(stage==="roll"){actions.appendChild(button("🎲 &nbsp; Lancer les dés",doRoll,true,"hero"));return}
 if(stage==="draft"){actions.appendChild(button("🏝️ &nbsp; Choisir une île",()=>toast("Touchez directement une île libre sur la carte."),true,"soft"));return}
 if(stage==="ended"){actions.appendChild(button("↻ &nbsp; Revanche",reset,true,"hero"));return}
 if(stage==="retreat"){actions.appendChild(button("⛵ &nbsp; Choisir mon refuge",pickRefuge,true,"hero"));return}
 const p=player(),tile=currentIsland(),target=state.selected===null?null:state.islands[state.selected];
 if(canAttack(state,state.selected))actions.appendChild(button("⚔️ &nbsp; Attaquer",()=>playBattle(state.selected),true,"danger"));
 if(tile.owner===null)actions.appendChild(button("🚩 &nbsp; Coloniser",doColonize,!state.actionUsed,"hero"));
 if(tile.owner===state.current){
  const shipCost=p.ship===1?10:20,townCost=tile.level===0?10:20;
  actions.appendChild(button("⛵ &nbsp; Navire <small>"+shipCost+" 🌲</small>",doShip,!state.actionUsed&&p.ship<3&&p.wood>=shipCost,"violet"));
  actions.appendChild(button("🏰 &nbsp; Ville <small>"+townCost+" 🪨</small>",doFort,!state.actionUsed&&tile.level<2&&p.stone>=townCost,"soft"));
 }
 actions.appendChild(button("Fin du tour ↗",nextTurn,true,"outline"));
}
function escapeHTML(s){return s.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function refresh(){board.sync(state);updateHud()}
function reset(){
 state=newGame();locked=false;board.rebuild(state);refresh();
 modal({icon:"🏝️",title:"Bienvenue dans ARCHIPEL",text:"Deux factions rivales, dix îles et une mer pleine de surprises. Explore et conquiers ton royaume miniature.",buttons:[{label:"Découvrir l'archipel",click:()=>{}}]});
}
async function onIsland(id){
 if(locked)return;
 const t=state.islands[id];
 if(state.stage==="roll"){toast("Commence par lancer les dés.");return}
 if(state.stage==="draft"){
  try{
   const e=chooseStart(state,id);board.sync(state);refresh();board.spark(t.x,t.z,0xf7df98);
   if(e.type==="chosen")toast("🏝️ "+name(e.player)+" prend "+t.name+". À "+name(e.next)+" !");
   else modal({icon:"⛵",title:"Que la conquête commence !",text:name(e.player)+" jouera en premier, pour compenser son second choix d'île.",buttons:[{label:"Jouer",click:()=>{}}]});
  }catch(ex){toast(ex.message)}return;
 }
 if(state.stage==="retreat"){if(refugeOptions(state).includes(id)){doRetreat(id)}else toast("Choisis une île alliée ou un refuge neutre.");return}
 if(state.stage!=="play")return;
 if(id===player().boat){state.selected=id;refresh();return}
 if(canAttack(state,id)){
  state.selected=id;refresh();toast("⚔️ "+t.name+" : attaque disponible dans le menu.");return;
 }
 if(canNavigate(state,id)){
  state.selected=id;locked=true;updateHud();
  try{
   const e=navigate(state,id);
   await board.sail(e.player,e.to,800);refresh();
   board.spark(t.x,t.z,0xd7fff1);
   toast("⛵ En route vers "+t.name+" !");
  }catch(ex){toast(ex.message)}finally{locked=false;refresh()}
  return;
 }
 state.selected=id;refresh();
 if(state.moveUsed)toast("Déplacement déjà utilisé pour ce tour.");
 else if(t.owner===1-state.current)toast("Île ennemie : une attaque doit partir d'une île directement reliée.");
 else toast("Cette île n'est pas directement reliée à ton navire.");
}
function doRoll(){
 if(locked)return;
 try{
  const e=rollForStart(state);refresh();
  modal({icon:"🎲",title:"Le destin a parlé !",
   text:name(e.winner)+" choisira son île en premier. L'autre faction jouera le premier tour.",
   special:'<div class="dice-row"><div class="die purple spin">'+e.dice[0]+'</div><span class="dice-vs">VS</span><div class="die amber spin">'+e.dice[1]+'</div></div><p class="dice-legend">Vélyra &nbsp;•&nbsp; Auréon</p>',
   buttons:[{label:"Choisir son île",click:()=>{}}]
  });
 }catch(e){toast(e.message)}
}
function doColonize(){
 if(locked)return;try{
 const e=colonize(state);refresh();
 const t=currentIsland();board.spark(t.x,t.z,0xffe4a4);
 if(e.type==="treasure"){
  const prize={cargo:"10 bois et 10 pierres",ship:"un niveau de navire supplémentaire",fort:"une amélioration des fortifications"}[e.gift];
  modal({icon:"💎",title:"Le trésor secret !",text:"Un coffre ancien vient d'être découvert sur "+t.name+" ! Récompense : "+prize+".",special:'<div class="treasure">✦ 📦 ✦</div>',buttons:[{label:"Magnifique !",click:()=>{}}]});
 }else if(e.type==="end")showEnding();
 else toast("🚩 "+t.name+" rejoint "+name(state.current)+" !");
 }catch(ex){toast(ex.message)}
}
function doShip(){
 try{const e=upgradeShip(state);refresh();const t=currentIsland();board.spark(t.x,t.z,0xdcbaff);toast("⛵ Navire amélioré au niveau "+e.level+" !")}catch(ex){toast(ex.message)}
}
function doFort(){
 try{const e=upgradeIsland(state);refresh();const t=currentIsland();board.spark(t.x,t.z,0xffe0b1);toast("🏰 "+t.name+" évolue : "+["Village","Ville","Ville fortifiée"][e.level]+" !")}catch(ex){toast(ex.message)}
}
async function playBattle(id){
 if(locked)return;locked=true;
 try{
  const result=attack(state,id);
  // Animate the physical pieces BEFORE replacing them with post-combat models.
  updateHud();await board.battleMotion(result);
  refresh();
  const a=result.attackerTotal,d=result.defenderTotal;
  const footer=result.win?"L'île est conquise, et ses fortifications perdent un niveau.":"Défaite : le bateau bat en retraite et perd un niveau. Une égalité favorise le défenseur.";
  modal({icon:result.win?"⚔️":"🛡️",title:result.win?"L'île est conquise !":"Attaque repoussée !",
   text:footer,
   special:'<div class="dice-row"><div class="dice-result"><div class="die purple spin">'+result.attackerDice+'</div><div class="dice-score">'+result.attackerDice+' + '+(a-result.attackerDice)+' = <b>'+a+'</b></div></div><span class="dice-vs">VS</span><div class="dice-result"><div class="die amber spin">'+result.defenderDice+'</div><div class="dice-score">'+result.defenderDice+' + '+(d-result.defenderDice)+' = <b>'+d+'</b></div></div></div>',
   buttons:[{label:result.win?"Continuer":"Reprendre la mer",click:()=>{
    if(result.domination)showEnding();
    else if(state.stage==="retreat")pickRefuge();
   }}]
  });
 }catch(ex){toast(ex.message)}finally{locked=false;refresh()}
}
function pickRefuge(){
 const opts=refugeOptions(state);
 if(!opts.length)return;
 const names=opts.map(id=>state.islands[id].name).join(", ");
 modal({icon:"⛵",title:"Retraite de "+name(1-state.current),text:"Le défenseur conserve son navire et choisit son refuge parmi : "+names+". Touche l'île sur la carte, ou choisis ci-dessous.",
 buttons:opts.map(id=>({label:state.islands[id].name,click:()=>doRetreat(id)}))
 });
}
async function doRetreat(id){
 if(locked)return;
 try{
  const e=retreat(state,id);locked=true;refresh();
  await board.sail(e.player,e.to,700);locked=false;refresh();toast("⛵ "+name(e.player)+" se réfugie sur "+state.islands[id].name);
 }catch(ex){locked=false;toast(ex.message)}
}
function nextTurn(){
 try{
  const e=finishTurn(state);refresh();
  if(e.type==="end"){showEnding();return}
  const p=player();
  modal({icon:e.player===0?"☾":"☀",title:"À "+p.name+" de jouer !",
   text:"Nouvelle récolte : +"+e.income.wood+" bois et +"+e.income.stone+" pierres. Prépare ta prochaine conquête.",
   buttons:[{label:"Commencer le tour",click:()=>{}}]});
 }catch(ex){toast(ex.message)}
}
function showEnding(){
 if(state.stage!=="ended")return;
 const w=state.winner,txt=w===null?"Les factions sont à égalité.":name(w)+" devient maître de l'archipel !";
 modal({icon:w===null?"🤝":"👑",title:w===null?"Match nul !":"Victoire de "+name(w)+" !",
  text:txt+" Vélyra : "+score(state,0)+" points et "+owned(state,0).length+" îles. Auréon : "+score(state,1)+" points et "+owned(state,1).length+" îles.",
  special:'<div class="ending-crest">✦ ⚜ ✦</div>',
  buttons:[{label:"Nouvelle aventure",click:reset}]});
}
$("restart").addEventListener("click",()=>modal({icon:"↻",title:"Nouvelle partie ?",text:"Recommencer génère dix nouvelles positions et ressources. La partie actuelle sera perdue.",
 buttons:[{label:"Annuler",secondary:true},{label:"Recommencer",click:reset}]}));
$("help").addEventListener("click",()=>modal({icon:"📜",title:"Comment jouer ?",text:"Chaque faction contrôle un navire. Chaque île produit 1 à 3 bois et 1 à 3 pierres par tour. Touchez une île reliée pour y naviguer. Pour attaquer une île ennemie, touchez-la puis choisissez Attaquer. Une action principale par tour. Navire : 10 puis 20 bois. Ville : 10 puis 20 pierres. 7 îles = victoire immédiate. Sinon score après 22 tours chacun.",buttons:[{label:"C'est compris"}]}));
let board;
try{
 board=new Board3D($("world"),onIsland);reset();
}catch(ex){
 console.error("Erreur de rendu 3D",ex);
 $("fallback").classList.remove("hidden");
 $("fallback").innerHTML="<h2>Rendu 3D indisponible</h2><p>Le chargement de la scène 3D a échoué. Vérifie ta connexion Internet et utilise Safari récent sur iPhone.</p><pre>"+escapeHTML(String(ex.message||ex))+"</pre>";
}
