import {
 FACTIONS,newGame,connected,owned,score,rollForStart,chooseStart,
 beginTurn,canNavigate,canAttack,previewAttack,navigate,colonize,upgradeShip,upgradeIsland,
 attack,refugeOptions,retreat,finishTurn
} from "./game.js?v=20261014-05";
import {Board3D} from "./board3d.js?v=20261014-05";
import {animateDice} from "./dice-v04.js";
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
 const acting=stage==="draft"?state.chooser:stage==="play"||stage==="retreat"?state.current:null;
 document.body.dataset.faction=acting===1?"aureon":acting===0?"velyra":"neutral";
 const steps=$("turn-steps");
 steps.classList.toggle("hidden",stage!=="play");
 if(stage==="play"){
  const step=state.actionUsed?3:state.moveUsed?2:1;
  steps.querySelectorAll(".turn-step").forEach(node=>{
   const n=Number(node.dataset.step);
   node.classList.toggle("active",n===step);
   node.classList.toggle("complete",n<step);
  });
 }
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
 guide.style.display=stage==="play"||stage==="retreat"||stage==="ended"?"none":"";
 if(stage==="roll"){stageName.textContent="Le choix des îles";caption.textContent="Deux royaumes. Un archipel.";guide.textContent="Lancez les dés pour commencer."}
 if(stage==="draft"){stageName.textContent=name(state.chooser)+" choisit son île";caption.textContent="Touchez une île libre.";guide.textContent="Les ressources sont visibles pour chaque île."}
 if(stage==="play"){
  const p=player(),tile=currentIsland();
  stageName.textContent=state.actionUsed?"Fin du tour • "+p.name:state.moveUsed?"Action • "+p.name:"Navigation • "+p.name;
  caption.textContent=(state.moveUsed?"⛵ Navigation effectuée":"⛵ 1 déplacement disponible")+"  ·  "+(state.actionUsed?"✓ Action utilisée":"✦ 1 action disponible");
  guide.textContent=state.actionUsed?"Action terminée : passe au joueur suivant.":tile?.owner===null?"Île neutre : colonise-la !":!state.moveUsed?"Navigue vers une île voisine (facultatif), ou agis depuis ton port.":"Sélectionne ton action, puis termine le tour.";
 }
 if(stage==="retreat"){stageName.textContent="Retraite !";caption.textContent="Choisis un refuge pour le défenseur.";guide.textContent="Le navire ne perd aucun niveau."}
 if(stage==="ended"){stageName.textContent=state.winner===null?"Match nul":name(state.winner)+" remporte la partie";caption.textContent="L'archipel attend une revanche.";guide.textContent="Partie terminée."}
 const tileInfo=state.selected===null?null:state.islands[state.selected];
 $("island-detail").classList.toggle("empty",!tileInfo);
 $("island-detail").innerHTML=tileInfo?
  '<div class="tile-name">'+escapeHTML(tileInfo.name)+'</div><span class="tile-owner">'+(tileInfo.owner===null?"Île neutre":name(tileInfo.owner))+(tileInfo.owner===null?"":" · "+["Village","Ville","Ville fortifiée"][tileInfo.level])+'</span><span class="tile-income">🌲 +'+tileInfo.wood+' &nbsp; 🪨 +'+tileInfo.stone+'</span>'
  :'<span class="tile-name">L’archipel</span><span class="tile-owner">10 îles à explorer</span>';
 const actions=$("actions");actions.replaceChildren();
 if(stage==="roll"){actions.appendChild(button("🎲 &nbsp; Lancer les dés",doRoll,true,"hero"));return}
 if(stage==="draft"){actions.appendChild(button("🏝️ &nbsp; Choisir une île",()=>toast("Touchez directement une île libre sur la carte."),true,"soft"));return}
 if(stage==="ended"){actions.appendChild(button("↻ &nbsp; Revanche",reset,true,"hero"));return}
 if(stage==="retreat"){actions.appendChild(button("⛵ &nbsp; Choisir mon refuge",pickRefuge,true,"hero"));return}
 const p=player(),tile=currentIsland(),target=state.selected===null?null:state.islands[state.selected];
 if(canAttack(state,state.selected))actions.appendChild(button("⚔️ &nbsp; Évaluer l’attaque",()=>showAttackPreview(state.selected),true,"danger"));
 if(tile.owner===null)actions.appendChild(button("🚩 &nbsp; Coloniser",doColonize,!state.actionUsed,"hero"));
 if(tile.owner===state.current){
  const shipCost=p.ship===1?10:20,townCost=tile.level===0?10:20;
  actions.appendChild(button("⛵ &nbsp; Navire <small>"+shipCost+" 🌲</small>",doShip,!state.actionUsed&&p.ship<3&&p.wood>=shipCost,"violet"));
  actions.appendChild(button("🏰 &nbsp; Ville <small>"+townCost+" 🪨</small>",doFort,!state.actionUsed&&tile.level<2&&p.stone>=townCost,"soft"));
 }
 actions.appendChild(button(state.actionUsed?"✓ Finir le tour →":"Passer / finir le tour →",nextTurn,true,"outline"));
}
function escapeHTML(s){return s.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function refresh(){board.sync(state);updateHud()}
function reset(){
 state=newGame();locked=false;board.rebuild(state);refresh();
 modal({icon:"🏝️",title:"Bienvenue dans ARCHIPEL",text:"Deux factions rivales, dix îles et une mer pleine de surprises. Pince pour zoomer, glisse pour explorer, ou masque l’interface pour admirer ton archipel.",buttons:[{label:"Découvrir l'archipel",click:()=>{}}]});
}
async function onIsland(id){
 if(locked||dialog.classList.contains("active"))return;
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
function revealDiceButton(label,click){
 const btn=document.createElement("button");
 btn.type="button";btn.className="dialog-button";btn.textContent=label;
 btn.addEventListener("click",()=>{dialog.classList.remove("active");click?.()});
 dialogButtons.appendChild(btn);
}
async function doRoll(){
 if(locked)return;locked=true;
 try{
  const event=rollForStart(state);refresh();
  modal({icon:"🎲",title:"Le destin des marées",text:"Deux dés miniatures vont déterminer qui choisit sa première île.",special:'<div id="dice-stage"></div>',buttons:[]});
  await animateDice($("dice-stage"),event.dice,[0,1]);
  dialogText.textContent="Vélyra : "+event.dice[0]+" • Auréon : "+event.dice[1]+". "+name(event.winner)+" choisit en premier. L'autre faction jouera en premier.";
  revealDiceButton("Choisir son île",()=>{});
 }catch(e){toast(e.message)}finally{locked=false}
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
function showAttackPreview(id){
 if(locked)return;
 let p;try{p=previewAttack(state,id)}catch(e){toast(e.message);return}
 const island=state.islands[id];
 const outlook=p.winPercent>=60?"Avantage offensif":p.winPercent<=35?"Attaque risquée":"Forces équilibrées";
 const details='<div class="attack-forecast">'+
 '<div class="forecast-teams">'+
 '<section class="forecast-side faction-'+p.attacker+'"><div class="forecast-label">⚔️ ATTAQUANT</div><b>'+name(p.attacker)+'</b>'+
 '<div class="forecast-equation"><span>🎲 Dé 1–6</span><strong>+ '+p.shipBonus+'</strong></div>'+
 '<div class="forecast-caption">⛵ Navire niveau '+p.shipLevel+' → bonus +'+p.shipBonus+'</div>'+
 '<div class="forecast-total">Force possible <b>'+p.attackerRange[0]+'–'+p.attackerRange[1]+'</b></div></section>'+
 '<section class="forecast-side faction-'+p.defender+'"><div class="forecast-label">🛡️ DÉFENSEUR</div><b>'+name(p.defender)+'</b>'+
 '<div class="forecast-equation"><span>🎲 Dé 1–6</span><strong>+ '+p.defenseBonus+'</strong></div>'+
 '<div class="forecast-caption">🏰 '+["Village","Ville","Ville fortifiée"][p.defenseLevel]+' → +'+p.defenseLevel+'</div>'+
 '<div class="forecast-caption">⛵ Bateau défensif : '+(p.defenderShipHere?'+1 présent':'0 absent')+'</div>'+
 '<div class="forecast-total">Force possible <b>'+p.defenderRange[0]+'–'+p.defenderRange[1]+'</b></div></section></div>'+
 '<div class="forecast-chance"><div class="forecast-chance-head"><span>'+outlook+'</span><strong>'+p.winPercent+' %</strong></div>'+
 '<div class="forecast-meter"><div style="width:'+p.winPercent+'%"></div></div>'+
 '<small>'+p.winningCombos+' combinaisons gagnantes sur 36. Une égalité favorise toujours le défenseur.</small></div>'+
 '<div class="forecast-risk">⚠️ Si tu perds : ton navire perd un niveau (minimum 1) et retourne à son port.<br>✅ Si tu gagnes : l’île change de camp et perd un niveau de fortification.</div></div>';
 modal({icon:"⚔️",title:"Attaquer "+island.name+" ?",
  text:"Voici les forces et les bonus avant de prendre ta décision.",special:details,
  buttons:[
   {label:"Annuler",secondary:true,click:()=>toast("Attaque annulée : aucune action consommée.")},
   {label:"⚔️ Attaquer !",click:()=>{
     if(canAttack(state,id))playBattle(id);else toast("La cible n'est plus attaquable.");
   }}
  ]
 });
}
async function playBattle(id){
 if(locked)return;locked=true;
 try{
  const result=attack(state,id);
  // Cannon approach, curling sea trail and impact precede the tangible 3D dice.
  updateHud();
  await board.battleMotion(result);
  refresh();
  const a=result.attackerTotal,d=result.defenderTotal;
  modal({icon:"🎲",title:"Bataille de "+state.islands[id].name,
   text:"Le destin se joue aux dés : "+name(result.attacker)+" attaque, "+name(result.defender)+" défend.",
   special:'<div id="dice-stage"></div><div class="battle-scores" id="battle-scores" aria-live="polite"></div>',
   buttons:[]});
  await animateDice($("dice-stage"),[result.attackerDice,result.defenderDice],[result.attacker,result.defender]);
  const notes=result.win?"La conquête est réussie ! Les fortifications ennemies reculent d'un niveau.":"Attaque repoussée. Le bateau attaquant recule et perd un niveau. Les égalités favorisent le défenseur.";
  dialogIcon.textContent=result.win?"🏆":"🛡️";
  dialogTitle.textContent=result.win?"Victoire de "+name(result.attacker)+" !":"La défense tient bon !";
  dialogText.textContent=notes;
  $("battle-scores").innerHTML='<span class="battle-attacker">'+name(result.attacker)+": "+result.attackerDice+" + "+(a-result.attackerDice)+" = <b>"+a+'</b></span><span class="battle-defender">'+name(result.defender)+": "+result.defenderDice+" + "+(d-result.defenderDice)+" = <b>"+d+"</b></span>";
  revealDiceButton(result.win?"Continuer":"Reprendre la mer",()=>{
   if(result.domination)showEnding();
   else if(state.stage==="retreat")pickRefuge();
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
  const e=retreat(state,id);locked=true;
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
$("help").addEventListener("click",()=>modal({icon:"📜",title:"Comment jouer ?",text:"Caméra : pince pour zoomer, glisse sur la mer pour explorer, utilise ⌖ pour recentrer et ◫ pour voir uniquement la carte. Le menu d’actions peut aussi être masqué et réaffiché. Chaque faction contrôle un navire. Chaque île produit 1 à 3 bois et 1 à 3 pierres par tour. Touchez une île reliée pour y naviguer. Pour attaquer une île ennemie, touchez-la puis choisissez Attaquer. Une action principale par tour. Navire : 10 puis 20 bois. Ville : 10 puis 20 pierres. 7 îles = victoire immédiate. Sinon score après 22 tours chacun.",buttons:[{label:"C'est compris"}]}));

function hideOrShowActions(){
 const collapsed=document.body.classList.toggle("dock-closed");
 const b=$("toggle-actions");
 b.setAttribute("aria-expanded",String(!collapsed));
 b.setAttribute("aria-label",collapsed?"Afficher le menu d’actions":"Masquer le menu d’actions");
 b.textContent=collapsed?"⌃  Afficher les actions":"⌄  Masquer les actions";
}
function mapOnly(value){
 document.body.classList.toggle("map-only",value);
 $("view-only").setAttribute("aria-pressed",String(value));
 $("restore-ui").setAttribute("aria-hidden",String(!value));
}
$("toggle-actions").addEventListener("click",hideOrShowActions);
$("view-only").addEventListener("click",()=>mapOnly(true));
$("restore-ui").addEventListener("click",()=>mapOnly(false));
$("zoom-in").addEventListener("click",()=>board?.zoomBy(1.30));
$("zoom-out").addEventListener("click",()=>board?.zoomBy(.77));
$("recenter").addEventListener("click",()=>board?.centerView());
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&document.body.classList.contains("map-only"))mapOnly(false);
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
 if(e.key==="+"||e.key==="=")board?.zoomBy(1.2);
 else if(e.key==="-")board?.zoomBy(.83);
 else if(e.key.toLowerCase()==="r"&&!e.ctrlKey&&!e.metaKey)board?.centerView();
});

let board;
try{
 board=new Board3D($("world"),onIsland);reset();
}catch(ex){
 console.error("Erreur de rendu 3D",ex);
 $("fallback").classList.remove("hidden");
 $("fallback").innerHTML="<h2>Rendu 3D indisponible</h2><p>Le chargement de la scène 3D a échoué. Vérifie ta connexion Internet et utilise Safari récent sur iPhone.</p><pre>"+escapeHTML(String(ex.message||ex))+"</pre>";
}
