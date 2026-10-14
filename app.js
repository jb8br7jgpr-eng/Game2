import {
 FACTIONS,newGame,connected,owned,score,rollForStart,chooseStart,
 beginTurn,canNavigate,canAttack,previewAttack,navigate,colonize,previewColonization,upgradeShip,upgradeIsland,
 attack,refugeOptions,retreat,finishTurn
} from "./game.js?v=20261014-08";
import {Board3D} from "./board3d.js?v=20261014-08";
import {animateDice} from "./dice-v04.js?v=20261014-names";
import {OnlineClient,shareUrl} from "./online.js?v=20261014-online";
const $=id=>document.getElementById(id);
let state=newGame(),locked=false;
let online=null,onlineRoom=null,onlineBusy=false;
const isOnline=()=>!!online&&!!onlineRoom;
const mySeat=()=>onlineRoom?.yourSeat;
const FACTION_SIGNS=["☾","☀"];
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
const name=i=>state.players[i]?.name||FACTIONS[i]?.name||"";
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
 const acting=stage==="draft"?state.chooser:stage==="retreat"?1-state.current:stage==="play"?state.current:null;
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
  const node=$("team-"+i),active=(stage==="play"&&state.current===i)||(stage==="retreat"&&1-state.current===i)||(stage==="draft"&&state.chooser===i);
  node.classList.toggle("active",active);node.classList.toggle("orange",i===1);
  node.querySelector(".team-title").textContent=p.name;
  node.querySelector(".team-count").textContent=owned(state,i).length+" îles • "+score(state,i)+" pts";
  node.querySelector(".team-ship").textContent="⛵ "+p.ship+"  ⚔ "+p.wins;
  node.querySelector(".team-wood").textContent=p.wood;
  node.querySelector(".team-stone").textContent=p.stone;
 });
 const caption=$("status-line"),stageName=$("stage-name"),guide=$("guide");
 guide.style.display=stage==="play"||stage==="retreat"||stage==="ended"?"none":"";
 if(stage==="roll"){stageName.textContent="Le choix des îles";caption.textContent="Deux royaumes. Un archipel.";guide.textContent="Lancez les dés pour commencer."}
 if(stage==="draft"){stageName.textContent=name(state.chooser)+" choisit son île";caption.textContent="Exploration ou choix guidé";guide.textContent="Touche une île ou compare les ressources et difficultés des 10 territoires."}
 if(stage==="play"){
  const p=player(),tile=currentIsland();
  stageName.textContent=state.actionUsed?"Fin du tour • "+p.name:state.moveUsed?"Action • "+p.name:"Navigation • "+p.name;
  caption.textContent=(state.moveUsed?"⛵ Navigation effectuée":"⛵ 1 déplacement disponible")+"  ·  "+(state.actionUsed?"✓ Action utilisée":"✦ 1 action disponible");
  guide.textContent=state.actionUsed?"Action terminée : passe au joueur suivant.":tile?.owner===null?"Île neutre : colonise-la !":!state.moveUsed?"Navigue vers une île voisine (facultatif), ou agis depuis ton port.":"Sélectionne ton action, puis termine le tour.";
 }
 if(stage==="retreat"){stageName.textContent="Retraite • "+name(1-state.current);caption.textContent="✦ Îles lumineuses = refuges disponibles";guide.textContent="Touche une île surlignée sur la carte, puis confirme le repli."}
 if(stage==="ended"){stageName.textContent=state.winner===null?"Match nul":name(state.winner)+" remporte la partie";caption.textContent="L'archipel attend une revanche.";guide.textContent="Partie terminée."}
 const tileInfo=state.selected===null?null:state.islands[state.selected];
 $("island-detail").classList.toggle("empty",!tileInfo);
 $("island-detail").innerHTML=tileInfo?
  '<div class="tile-name">'+escapeHTML(tileInfo.name)+'</div><span class="tile-owner">'+(tileInfo.owner===null?"Île neutre · difficulté "+tileInfo.difficulty:escapeHTML(name(tileInfo.owner))+" · "+["Village","Ville","Ville fortifiée"][tileInfo.level])+'</span><span class="tile-income">🌲 +'+tileInfo.wood+' &nbsp; 🪨 +'+tileInfo.stone+'</span>'
  :'<span class="tile-name">L’archipel</span><span class="tile-owner">10 îles à explorer</span>';
 const actions=$("actions");actions.replaceChildren();
 if(isOnline()){
  const actor=stage==="roll"?0:stage==="draft"?state.chooser:stage==="retreat"?1-state.current:stage==="play"?state.current:null;
  if(actor!==null&&actor!==mySeat()){
   actions.appendChild(button("⏳ &nbsp; "+escapeHTML(name(actor))+" joue sur son téléphone",()=>{},false,"hero"));
   return;
  }
 }
 if(stage==="roll"){actions.appendChild(button("🎲 &nbsp; Lancer les dés",doRoll,true,"hero"));return}
 if(stage==="draft"){actions.appendChild(button("🏝️ &nbsp; Voir les 10 îles",openIslandPicker,true,"hero"));return}
 if(stage==="ended"){actions.appendChild(button("↻ &nbsp; Revanche",reset,true,"hero"));return}
 if(stage==="retreat"){actions.appendChild(button("🗺️ &nbsp; Voir les refuges",pickRefuge,true,"hero"));return}
 const p=player(),tile=currentIsland(),target=state.selected===null?null:state.islands[state.selected];
 if(canAttack(state,state.selected))actions.appendChild(button("⚔️ &nbsp; Évaluer l’attaque",()=>showAttackPreview(state.selected),true,"danger"));
 if(tile.owner===null){const exp=state.actionUsed?null:previewColonization(state);actions.appendChild(button("🧭 &nbsp; Expédition"+(exp?" • "+exp.successPercent+" %":""),showColonizationPreview,!state.actionUsed,"hero"));}
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
 if(online){online.dispose();online.clear();online=null;onlineRoom=null}
 $("online-lobby").hidden=true;
 const previous=state?.players?.map(p=>p.name)||FACTIONS.map(f=>f.name);
 state=newGame();locked=false;
 state.players.forEach((p,i)=>{p.name=previous[i]||FACTIONS[i].name});
 for(let i=0;i<2;i++)$("player-name-"+i).value=state.players[i].name;
 dialog.classList.remove("active");
 $("welcome").hidden=false;
 document.body.classList.add("in-lobby");
 mapOnly(false);
 board.rebuild(state);refresh();
}
function beginAdventure(e){
 e.preventDefault();
 if(locked)return;
 const inputs=[0,1].map(i=>$("player-name-"+i));
 inputs.forEach(input=>input.setCustomValidity(""));
 const names=inputs.map(input=>input.value.trim().replace(/\s+/g," "));
 if(names.some(n=>!n)){
  const invalid=names.findIndex(n=>!n);
  inputs[invalid].setCustomValidity("Choisis un nom pour cette faction.");
  inputs[invalid].reportValidity();return;
 }
 if(names[0].toLocaleLowerCase("fr")===names[1].toLocaleLowerCase("fr")){
  inputs[1].setCustomValidity("Les deux factions doivent avoir des noms différents.");
  inputs[1].reportValidity();return;
 }
 state.players.forEach((p,i)=>{p.name=names[i]});
 $("welcome").hidden=true;
 document.body.classList.remove("in-lobby");
 board.centerView();refresh();
 toast("⚔️ "+name(0)+" contre "+name(1)+" — que l'aventure commence !");
}

async function pickStartingIsland(id){
 if(state.stage!=="draft"||locked)return;
 try{
  if(isOnline()&&state.chooser!==mySeat()){toast("Attends le choix de "+name(state.chooser));return}
  const tile=state.islands[id],event=isOnline()?await onlineAction("choose-start",{island:id}):chooseStart(state,id);
  board.sync(state);
  refresh();
  board.spark(tile.x,tile.z,0xf7df98);
  if(event.type==="chosen"){
   board.centerView();
   toast("🏝️ "+name(event.player)+" prend "+tile.name+". À "+name(event.next)+" !");
  }else{
   board.viewPlayer(state.current,1.12);
   modal({icon:"⛵",title:"Que la conquête commence !",
    text:name(event.player)+" joue en premier pour compenser son second choix d'île.",
    buttons:[{label:"Jouer",click:()=>{}}]});
  }
 }catch(ex){toast(ex.message)}
}
function openIslandPicker(){
 if(state.stage!=="draft")return;
 const candidates=state.islands.filter(tile=>tile.owner===null);
 const cards=candidates.map(tile=>
  '<div class="draft-island-card" data-island="'+tile.id+'">'+
  '<div class="draft-island-name">'+escapeHTML(tile.name)+'</div>'+
  '<div class="draft-island-resources">🌲 '+tile.wood+' bois · 🪨 '+tile.stone+' pierre · 🧭 difficulté '+tile.difficulty+'</div>'+
  '<div class="draft-island-controls">'+
  '<button class="draft-view" data-island="'+tile.id+'" type="button">🔎 Observer</button>'+
  '<button class="draft-choose" data-island="'+tile.id+'" type="button">Choisir cette île</button>'+
  '</div></div>').join("");
 modal({icon:"🗺️",title:"Choisir sa première île",
  text:name(state.chooser)+" : compare les ressources puis sélectionne ton territoire. Tu peux aussi observer son modèle en 3D.",
  special:'<div class="draft-list">'+cards+'</div>',
  buttons:[{label:"Retour à la carte",secondary:true,click:()=>{}}]});
 const list=dialogSpecial.querySelector(".draft-list");
 list.addEventListener("click",e=>{
  const b=e.target.closest("button[data-island]");if(!b)return;
  const id=Number(b.dataset.island);
  dialog.classList.remove("active");
  if(b.classList.contains("draft-view")){
   board.viewIsland(id,1.45);
   toast("🔎 "+state.islands[id].name+" : touche l'île pour la sélectionner, ou rouvre la liste.");
  }else pickStartingIsland(id);
 });
}
async function onIsland(id){
 if(locked||dialog.classList.contains("active"))return;
 const t=state.islands[id];
 if(state.stage==="roll"){toast("Commence par lancer les dés.");return}
 if(state.stage==="draft"){if(isOnline()&&state.chooser!==mySeat())toast("Attends "+name(state.chooser));else pickStartingIsland(id);return;}
 if(state.stage==="retreat"){if(isOnline()&&mySeat()!==1-state.current){toast("Attends le défenseur.");return}if(refugeOptions(state).includes(id)){confirmRetreat(id)}else toast("Choisis une île lumineuse pour ton refuge.");return}
 if(state.stage!=="play")return;
 if(isOnline()&&state.current!==mySeat()){toast("C’est à "+name(state.current)+" de jouer.");return}
 if(id===player().boat){state.selected=id;refresh();return}
 if(canAttack(state,id)){
  state.selected=id;refresh();toast("⚔️ "+t.name+" : attaque disponible dans le menu.");return;
 }
 if(canNavigate(state,id)){
  state.selected=id;locked=true;updateHud();
  try{
   const e=isOnline()?await onlineAction("navigate",{island:id}):navigate(state,id);
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
  const event=isOnline()?await onlineAction("roll"):rollForStart(state);refresh();
  modal({icon:"🎲",title:"Le destin des marées",text:"Deux dés miniatures vont déterminer qui choisit sa première île.",special:'<div id="dice-stage"></div>',buttons:[]});
  await animateDice($("dice-stage"),event.dice,[0,1],state.players.map(p=>p.name));
  dialogText.textContent=name(0)+" (violet) : "+event.dice[0]+" • "+name(1)+" (orange) : "+event.dice[1]+". "+name(event.winner)+" choisit en premier. L'autre faction jouera en premier.";
  revealDiceButton("Choisir son île",()=>{});
 }catch(e){toast(e.message)}finally{locked=false}
}

function showColonizationPreview(){
 if(locked)return;
 let info;try{info=previewColonization(state)}catch(ex){toast(ex.message);return}
 const tile=state.islands[info.island],risk=info.successPercent>=65?"Expédition favorable":info.successPercent>=45?"Défi équilibré":"Île difficile";
 const special='<div class="expedition-preview">'+
  '<div class="expedition-terrain"><span>🏝️ '+tile.name+'</span><strong>Difficulté '+info.difficulty+'</strong></div>'+
  '<div class="expedition-equation"><span>🎲 Dé 1–6</span><span>+ '+info.bonus+' navire</span><strong>≥ '+info.difficulty+'</strong></div>'+
  '<div class="expedition-level">⛵ Navire niveau '+info.shipLevel+' · Total possible : '+info.range[0]+' à '+info.range[1]+'</div>'+
  '<div class="expedition-success"><span>'+risk+'</span><strong>'+info.successPercent+' %</strong></div>'+
  '<div class="forecast-meter"><div style="width:'+info.successPercent+'%"></div></div>'+
  '<div class="expedition-footnote">'+info.winningSides+' faces gagnantes sur 6. Un échec consomme l’action, mais ton navire reste sur l’île et peut réessayer au tour suivant.</div></div>';
 modal({icon:"🧭",title:"Expédition sur "+tile.name,
  text:"Ton équipage doit réussir son exploration avant de pouvoir fonder un village.",
  special,buttons:[
   {label:"Annuler",secondary:true},
   {label:"🎲 Lancer l’expédition",click:doColonize}
  ]});
}
async function doColonize(){
 if(locked)return;
 locked=true;
 try{
  const active=state.current,before={wood:state.players[active].wood,stone:state.players[active].stone};
  const event=isOnline()?await onlineAction("colonize"):colonize(state);
  const tile=state.islands[event.island];
  refresh();
  modal({icon:"🎲",title:"Expédition de "+name(active),text:"Le dé roule... Il faut atteindre "+event.difficulty+" ou plus, bonus compris.",
   special:'<div id="dice-stage"></div><div class="expedition-roll-score"></div>',buttons:[]});
  await animateDice($("dice-stage"),[event.die],[active],state.players.map(p=>p.name));
  dialogSpecial.querySelector(".expedition-roll-score").textContent="🎲 "+event.die+" + "+event.bonus+" = "+event.total+" · Objectif "+event.difficulty;
  await board.expeditionEffect(event.island,event.success);
  if(!event.success){
   dialogIcon.textContent="🌧️";dialogTitle.textContent="Expédition repoussée !";
   dialogText.textContent="L’exploration de "+tile.name+" échoue. Ton bateau reste sur place ; réessaie à ton prochain tour.";
   revealDiceButton("Terminer ce tour",()=>{});
   return;
  }
  board.spark(tile.x,tile.z,0xffe3a2);
  if(event.type==="treasure"){
   const rewards={
    cargo:{
     icon:"🪵",type:"PROVISIONS ROYALES",title:"Un coffre de ressources !",
     detail:"Tu gagnes du bois et de la pierre pour développer tes îles.",
     amount:"+"+(state.players[active].wood-before.wood)+" bois · +"+(state.players[active].stone-before.stone)+" pierre",
     note:"Récompense de +10 par ressource, dans la limite de 40."
    },
    ship:{
     icon:"⛵",type:"PLAN DE MAÎTRE NAVIGATEUR",title:"Ton navire est amélioré !",
     detail:"La flotte de "+name(active)+" reçoit immédiatement un niveau gratuit.",
     amount:"Navire niveau "+state.players[active].ship,
     note:"Bonus d'attaque actuel : +"+(state.players[active].ship-1)+"."
    },
    fort:{
     icon:"🏰",type:"FAVEUR DES BÂTISSEURS",title:"Une ville offerte !",
     detail:"Les bâtisseurs améliorent gratuitement "+tile.name+".",
     amount:["Village","Ville","Ville fortifiée"][tile.level]+" · niveau "+tile.level,
     note:"Défense locale améliorée de +1."
    }
   };
   const prize=rewards[event.gift];
   dialog.classList.remove("active");
   await board.revealTreasure(tile.id,event.gift);
   modal({
    icon:"💎",title:"Trésor découvert sur "+tile.name+" !",
    text:prize.detail,
    special:'<div class="treasure-reveal '+event.gift+'"><div class="treasure-aura" aria-hidden="true">✦ ✧ ✦</div>'+
      '<div class="treasure-reward-symbol" aria-hidden="true">'+prize.icon+'</div>'+
      '<div class="treasure-kind">'+prize.type+'</div>'+
      '<div class="treasure-reward-title">'+prize.title+'</div>'+
      '<div class="treasure-amount">'+prize.amount+'</div>'+
      '<div class="treasure-note">'+prize.note+'</div>'+
      '<div class="treasure-sparkles" aria-hidden="true">✧ ✦ ✧ ✦ ✧</div></div>',
    buttons:[{label:"✨ Récupérer mon trésor",click:()=>board.spark(tile.x,tile.z,0xffefb2)}]
   });
  }else if(event.type==="end"){
    dialog.classList.remove("active");showEnding();
  }else{
   dialogIcon.textContent="🚩";dialogTitle.textContent=tile.name+" rejoint "+name(active)+" !";
   dialogText.textContent="Expédition réussie ! Le village est fondé et produira du bois et de la pierre à partir de ton prochain tour.";
   revealDiceButton("Continuer",()=>{});
  }
 }catch(error){toast(error.message)}
 finally{locked=false;refresh()}
}

async function doShip(){
 if(locked)return;locked=true;
 try{
  const e=isOnline()?await onlineAction("upgrade-ship"):upgradeShip(state),tile=currentIsland();refresh();
  await board.upgradeEffect(tile.id,"ship");
  toast("⛵ Navire amélioré au niveau "+e.level+" !");
 }catch(ex){toast(ex.message)}finally{locked=false;refresh()}
}
async function doFort(){
 if(locked)return;locked=true;
 try{
  const e=isOnline()?await onlineAction("upgrade-island"):upgradeIsland(state),tile=currentIsland();refresh();
  await board.upgradeEffect(tile.id,"town");
  toast("🏰 "+tile.name+" évolue : "+["Village","Ville","Ville fortifiée"][e.level]+" !");
 }catch(ex){toast(ex.message)}finally{locked=false;refresh()}
}
function showAttackPreview(id){
 if(locked)return;
 let p;try{p=previewAttack(state,id)}catch(e){toast(e.message);return}
 const island=state.islands[id];
 const outlook=p.winPercent>=60?"Avantage offensif":p.winPercent<=35?"Attaque risquée":"Forces équilibrées";
 const details='<div class="attack-forecast">'+
 '<div class="forecast-teams">'+
 '<section class="forecast-side faction-'+p.attacker+'"><div class="forecast-label">⚔️ ATTAQUANT</div><b>'+escapeHTML(name(p.attacker))+'</b>'+
 '<div class="forecast-equation"><span>🎲 Dé 1–6</span><strong>+ '+p.shipBonus+'</strong></div>'+
 '<div class="forecast-caption">⛵ Navire niveau '+p.shipLevel+' → bonus +'+p.shipBonus+'</div>'+
 '<div class="forecast-total">Force possible <b>'+p.attackerRange[0]+'–'+p.attackerRange[1]+'</b></div></section>'+
 '<section class="forecast-side faction-'+p.defender+'"><div class="forecast-label">🛡️ DÉFENSEUR</div><b>'+escapeHTML(name(p.defender))+'</b>'+
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
  const result=isOnline()?await onlineAction("attack",{island:id}):attack(state,id);
  // Cannon approach, curling sea trail and impact precede the tangible 3D dice.
  updateHud();
  await board.battleMotion(result);
  refresh();
  const a=result.attackerTotal,d=result.defenderTotal;
  modal({icon:"🎲",title:"Bataille de "+state.islands[id].name,
   text:"Le destin se joue aux dés : "+name(result.attacker)+" attaque, "+name(result.defender)+" défend.",
   special:'<div id="dice-stage"></div><div class="battle-scores" id="battle-scores" aria-live="polite"></div>',
   buttons:[]});
  await animateDice($("dice-stage"),[result.attackerDice,result.defenderDice],[result.attacker,result.defender],state.players.map(p=>p.name));
  const notes=result.win?"La conquête est réussie ! Les fortifications ennemies reculent d'un niveau.":"Attaque repoussée. Le bateau attaquant recule et perd un niveau. Les égalités favorisent le défenseur.";
  dialogIcon.textContent=result.win?"🏆":"🛡️";
  dialogTitle.textContent=result.win?"Victoire de "+name(result.attacker)+" !":"La défense tient bon !";
  dialogText.textContent=notes;
  $("battle-scores").innerHTML='<span class="battle-attacker">'+escapeHTML(name(result.attacker))+": "+result.attackerDice+" + "+(a-result.attackerDice)+" = <b>"+a+'</b></span><span class="battle-defender">'+escapeHTML(name(result.defender))+": "+result.defenderDice+" + "+(d-result.defenderDice)+" = <b>"+d+"</b></span>";
  revealDiceButton(result.win?"Continuer":"Reprendre la mer",()=>{
   if(result.domination)showEnding();
   else if(state.stage==="retreat")pickRefuge();
  });
 }catch(ex){toast(ex.message)}finally{locked=false;refresh()}
}

function pickRefuge(){
 const opts=refugeOptions(state);
 if(!opts.length){toast("Aucun refuge disponible.");return}
 dialog.classList.remove("active");
 board.showRetreatOptions(opts,1-state.current);
 board.frameIslands(opts);
 refresh();
 toast("✦ "+name(1-state.current)+" : touche une île lumineuse pour ton refuge.");
}
function confirmRetreat(id){
 if(locked||state.stage!=="retreat")return;
 const opts=refugeOptions(state);
 if(!opts.includes(id)){toast("Cette île n’est pas un refuge possible.");return}
 state.selected=id;refresh();
 board.viewIsland(id,1.1);
 modal({icon:"⛵",title:"Repli vers "+state.islands[id].name+" ?",
  text:name(1-state.current)+" conservera son bateau au même niveau. Confirme la destination ou retourne à la carte pour examiner les autres îles.",
  buttons:[
   {label:"Retour à la carte",secondary:true,click:pickRefuge},
   {label:"⛵ Confirmer le refuge",click:()=>doRetreat(id)}
  ]});
}
async function doRetreat(id){
 if(locked)return;
 locked=true;
 try{
  const move=isOnline()?await onlineAction("retreat",{island:id}):retreat(state,id);
  board.showRetreatOptions([]);
  await board.sail(move.player,move.to,1050);
  board.viewPlayer(state.current,1.12);
  refresh();
  toast("⛵ "+name(move.player)+" se réfugie sur "+state.islands[id].name);
 }catch(ex){toast(ex.message)}
 finally{locked=false;refresh()}
}
async function nextTurn(){
 if(locked)return;locked=true;
 try{
  const e=isOnline()?await onlineAction("finish-turn"):finishTurn(state);refresh();
  if(e.type!=="end")board.viewPlayer(state.current,1.12);
  if(e.type==="end"){showEnding();return}
  const p=player();
  modal({icon:e.player===0?"☾":"☀",title:"À "+p.name+" de jouer !",
   text:"Nouvelle récolte : +"+e.income.wood+" bois et +"+e.income.stone+" pierres. Prépare ta prochaine conquête.",
   buttons:[{label:"Commencer le tour",click:()=>{}}]});
 }catch(ex){toast(ex.message)}finally{locked=false;refresh()}
}
function showEnding(){
 if(state.stage!=="ended")return;
 const w=state.winner,txt=w===null?"Les factions sont à égalité.":name(w)+" devient maître de l'archipel !";
 modal({icon:w===null?"🤝":"👑",title:w===null?"Match nul !":"Victoire de "+name(w)+" !",
  text:txt+" "+name(0)+" : "+score(state,0)+" points et "+owned(state,0).length+" îles. "+name(1)+" : "+score(state,1)+" points et "+owned(state,1).length+" îles.",
  special:'<div class="ending-crest">✦ ⚜ ✦</div>',
  buttons:[{label:"Nouvelle aventure",click:reset}]});
}
$("restart").addEventListener("click",()=>modal({icon:"↻",title:"Nouvelle partie ?",text:"Recommencer génère dix nouvelles positions et ressources. La partie actuelle sera perdue.",
 buttons:[{label:"Annuler",secondary:true},{label:"Recommencer",click:reset}]}));
$("help").addEventListener("click",()=>modal({icon:"📜",title:"Comment jouer ?",text:"Caméra : pince pour zoomer, glisse sur la mer pour explorer, utilise ⌖ pour recentrer et ◫ pour voir uniquement la carte. Le menu d’actions peut aussi être masqué et réaffiché. Chaque faction contrôle un navire. Chaque île neutre demande une expédition : dé + bonus du navire contre difficulté 3, 4 ou 5. En cas d’échec, l’action est dépensée mais le bateau reste sur l’île et pourra réessayer. Chaque île produit 1 à 3 bois et 1 à 3 pierres par tour. Touchez une île reliée pour y naviguer. Pour attaquer une île ennemie, touchez-la puis choisissez Attaquer. Une action principale par tour. Navire : 10 puis 20 bois. Ville : 10 puis 20 pierres. 7 îles = victoire immédiate. Sinon score après 22 tours chacun.",buttons:[{label:"C'est compris"}]}));

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

// Online matches are server-authoritative. This client never rolls or grants
// resources locally when a two-phone session is connected.
function onlineNotice(message=""){$("online-error").textContent=message}
function onlineForm(mode){
 $("online-create-form").hidden=mode!=="create";
 $("online-join-form").hidden=mode!=="join";
 $("online-mode-create").classList.toggle("chosen",mode==="create");
 $("online-mode-join").classList.toggle("chosen",mode==="join");
 $("online-setup").hidden=false;
 $("online-room").hidden=true;
 onlineNotice();
}
function showOnlineLobby(mode="create"){
 $("online-lobby").hidden=false;
 onlineForm(mode);
}
function paintOnlineRoom(room){
 $("online-lobby").hidden=false;
 $("online-setup").hidden=true;
 $("online-room").hidden=false;
 $("online-room-code").textContent=room.code;
 $("online-player-0").textContent=room.names[0]||"En attente";
 $("online-player-1").textContent=room.names[1]||"En attente du capitaine";
 $("online-room-status").textContent=room.status==="ready"?
    (room.host?"Deux capitaines présents ! Lance la partie quand tu veux.":"Les deux joueurs sont là. L'hôte va lancer la partie.") :
    "En attente du deuxième capitaine… Partage le code ou le lien.";
 $("online-launch").hidden=!room.host||room.status!=="ready";
}
async function onlineOpponentEvent(event){
 if(!event||dialog.classList.contains("active")||locked)return;
 if(event.type==="roll"&&Array.isArray(event.dice)){
  modal({icon:"🎲",title:"Le destin des marées",text:"Le tirage au sort vient d'avoir lieu !",special:'<div id="dice-stage"></div>',buttons:[]});
  await animateDice($("dice-stage"),event.dice,[0,1],state.players.map(p=>p.name));
  dialogText.textContent=name(event.winner)+" choisit son île en premier.";
  revealDiceButton("Continuer",()=>{});
 }else if(event.type==="battle"){
  const battle=event;
  modal({icon:"⚔️",title:"Bataille de "+state.islands[event.to].name,
   text:name(event.attacker)+" contre "+name(event.defender)+" : les dés sont lancés !",
   special:'<div id="dice-stage"></div><div class="battle-scores" id="battle-scores"></div>',buttons:[]});
  await animateDice($("dice-stage"),[battle.attackerDice,battle.defenderDice],
   [battle.attacker,battle.defender],state.players.map(p=>p.name));
  dialogTitle.textContent=battle.win?"Victoire de "+name(battle.attacker)+" !":"Attaque repoussée !";
  dialogText.textContent=battle.win?"L'île change de camp.":"Les défenseurs ont tenu bon.";
  $("battle-scores").textContent=name(battle.attacker)+" : "+battle.attackerTotal+" · "+name(battle.defender)+" : "+battle.defenderTotal;
  revealDiceButton("Continuer",()=>{
   if(state.stage==="retreat"&&mySeat()===1-state.current)pickRefuge();
   else if(state.stage==="ended")showEnding();
  });
 }else if(["colonize","expedition","treasure"].includes(event.type)){
  const tile=state.islands[event.island];
  modal({icon:"🧭",title:"Expédition de "+name(event.player),
   text:"Exploration de "+tile.name+" : lancement du dé partagé.",
   special:'<div id="dice-stage"></div><div class="expedition-roll-score"></div>',buttons:[]});
  await animateDice($("dice-stage"),[event.die],[event.player],state.players.map(p=>p.name));
  const score=dialogSpecial.querySelector(".expedition-roll-score");
  if(score)score.textContent="🎲 "+event.die+" + "+event.bonus+" = "+event.total+" · Objectif "+event.difficulty;
  dialogIcon.textContent=event.success?"🏝️":"🌧️";
  dialogTitle.textContent=event.success?"Colonisation réussie !":"Expédition repoussée !";
  dialogText.textContent=event.success?name(event.player)+" prend "+tile.name+" !" +
   (event.type==="treasure"?" 💎 Un trésor a été découvert ("+event.gift+").":""):
   "Le navire reste sur l'île : une nouvelle tentative sera possible au prochain tour.";
  revealDiceButton("Continuer",()=>{});
 }else if(event.type==="turn"){
  modal({icon:event.player===0?"☾":"☀",title:"À "+name(event.player)+" de jouer !",
   text:event.player===mySeat()?"C'est ton tour de conquérir l'archipel !":"L'adversaire réfléchit à son prochain mouvement.",
   buttons:[{label:"Continuer"}]});
 }else if(event.type==="chosen"){
  toast("🏝️ "+name(event.player)+" prend "+state.islands[event.island].name);
 }else if(event.type==="retreat"){
  toast("⛵ "+name(event.player)+" se replie sur "+state.islands[event.to].name);
 }else if(event.type==="ship"||event.type==="build"){
  toast("⚒️ "+name(event.player??state.current)+" a amélioré son territoire !");
 }else if(event.type==="end"){
  showEnding();
 }
}
function receiveOnlineRoom(room,self=false){
 if(!online)return;
 if(onlineRoom&&room.id!==onlineRoom.id)return;
 const previous=onlineRoom,prior=state,oldStage=previous?.game?.stage;
 if(previous&&Number(room.version)<Number(previous.version))return;
 onlineRoom=room;
 online.lastRoom=room;
 if(room.game){
  const first=!previous?.game;
  state=room.game;
  if(first){
   $("welcome").hidden=true;$("online-lobby").hidden=true;
   document.body.classList.remove("in-lobby");
   dialog.classList.remove("active");
   board.rebuild(state);
  }else{
   // Save the pre-sync vessel position. Server state is applied immediately,
   // but the player's actual voyage should still visibly cross the sea.
   const travel=room.lastEvent;
   const moving=travel&&["navigate","retreat"].includes(travel.type)&&
    Number.isInteger(travel.player)&&travel.to!==undefined;
   const model=moving?board.boatModels[travel.player]?.group:null;
   const origin=model?.position.clone();
   board.sync(state);
   if(origin&&model){
    model.position.copy(origin);
    if(!self){
     board.sail(travel.player,travel.to,860).then(()=>{
      if(state.stage==="play"&&state.current===travel.player)board.viewPlayer(state.current,1.12);
     }).catch(e=>console.warn("Animation de navire distant",e));
    }
   }
  }
  if(first||state.stage==="play"&&(prior?.current!==state.current||oldStage!=="play")){
   board.viewPlayer(state.current,1.12);
  }
  if(state.stage==="retreat"&&mySeat()===1-state.current&&!self&&
   previous?.game?.stage!=="retreat"){
   // Never force the defender to use controls belonging to the attacker.
   board.showRetreatOptions(refugeOptions(state),mySeat());
  }else if(state.stage!=="retreat"){
   board.showRetreatOptions([]);
  }
  updateHud();
  if(!self&&previous&&Number(room.version)>Number(previous.version)){
   onlineOpponentEvent(room.lastEvent).catch(e=>console.warn("Animation multijoueur",e));
  }
 }else{
  paintOnlineRoom(room);
 }
}
async function onlineAction(action,args={}){
 if(!isOnline())throw Error("Salon en ligne introuvable.");
 if(onlineBusy)throw Error("Action en cours de synchronisation.");
 onlineBusy=true;
 try{
  const result=await online.act(action,args,onlineRoom.version);
  receiveOnlineRoom(result.room,true);
  return result.event;
 }catch(error){
  // A stale optimistic state must never grant an action.
  if(String(error.message).includes("évolué")){
   const latest=await online.get();
   receiveOnlineRoom(latest,true);
  }
  throw error;
 }finally{onlineBusy=false}
}
function beginOnlineWatch(client,room){
 if(online&&online!==client)online.dispose();
 online=client;
 receiveOnlineRoom(room,true);
 online.watch(next=>receiveOnlineRoom(next,false),e=>{
  if(!$("online-lobby").hidden)onlineNotice("Reconnexion en cours : "+e.message);
 });
}
async function createOnline(e){
 e.preventDefault();
 const btn=$("online-create-form").querySelector("button[type=submit]");
 if(btn.disabled)return;
 btn.disabled=true;onlineNotice("Création du salon…");
 const client=new OnlineClient();
 try{
  const room=await client.create($("online-create-name").value.trim());
  beginOnlineWatch(client,room);
  onlineNotice("");
 }catch(err){onlineNotice(err.message);client.dispose()}
 finally{btn.disabled=false}
}
async function joinOnline(e){
 e.preventDefault();
 const btn=$("online-join-form").querySelector("button[type=submit]");
 if(btn.disabled)return;
 btn.disabled=true;onlineNotice("Connexion au salon…");
 const client=new OnlineClient();
 try{
  const room=await client.join($("online-join-code").value.trim(),
   $("online-join-name").value.trim());
  beginOnlineWatch(client,room);
  onlineNotice("");
 }catch(err){onlineNotice(err.message);client.dispose()}
 finally{btn.disabled=false}
}
async function resumeOnline(){
 const saved=OnlineClient.restore();
 const invitation=new URLSearchParams(location.search).get("room");
 if(!saved){
  if(invitation){
   $("online-join-code").value=invitation.trim().toUpperCase();
   showOnlineLobby("join");
  }
  return;
 }
 const client=new OnlineClient();client.session=saved;
 try{
  const room=await client.get();
  beginOnlineWatch(client,room);
 }catch(e){
  // Keep the reconnect token in case this is a temporary loss of network.
  client.dispose();
  if(invitation){
   $("online-join-code").value=invitation.trim().toUpperCase();
   showOnlineLobby("join");
  }
 }
}
$("open-online").addEventListener("click",()=>showOnlineLobby("create"));
$("online-mode-create").addEventListener("click",()=>onlineForm("create"));
$("online-mode-join").addEventListener("click",()=>onlineForm("join"));
$("online-create-form").addEventListener("submit",createOnline);
$("online-join-form").addEventListener("submit",joinOnline);
$("online-launch").addEventListener("click",async()=>{
 if(onlineBusy)return;
 $("online-launch").disabled=true;
 onlineNotice("Préparation de l'archipel…");
 try{await onlineAction("start");onlineNotice("")}
 catch(e){onlineNotice(e.message)}finally{$("online-launch").disabled=false}
});
$("online-close").addEventListener("click",()=>{
 if(online){online.dispose();online.clear();online=null;onlineRoom=null}
 $("online-lobby").hidden=true;
 $("welcome").hidden=false;document.body.classList.add("in-lobby");
 dialog.classList.remove("active");
});
$("online-copy").addEventListener("click",async()=>{
 if(!onlineRoom)return;
 try{await navigator.clipboard.writeText(onlineRoom.code);onlineNotice("Code copié !")}
 catch{onlineNotice("Code à partager : "+onlineRoom.code)}
});
$("online-share").addEventListener("click",async()=>{
 if(!onlineRoom)return;
 try{await navigator.clipboard.writeText(shareUrl(onlineRoom.code));onlineNotice("Lien d'invitation copié !")}
 catch{onlineNotice("Partage ce lien : "+shareUrl(onlineRoom.code))}
});

$("welcome-form").addEventListener("submit",beginAdventure);
for(const input of [$("player-name-0"),$("player-name-1")]){
 input.addEventListener("input",()=>input.setCustomValidity(""));
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
  resumeOnline().catch(e=>console.warn("Reconnexion multijoueur",e));
 // Development-only browser hooks: never exposed on the deployed github.io host.
 if(location.hostname==="127.0.0.1"||location.hostname==="localhost"){
  window.__ARCHIPEL_TEST={getState:()=>state,refresh,reset,beginAdventure,showAttackPreview,showColonizationPreview,doColonize,pickRefuge,confirmRetreat,doRetreat,getBoard:()=>board,openIslandPicker,pickStartingIsland};
 }
}catch(ex){
 console.error("Erreur de rendu 3D",ex);
 $("fallback").classList.remove("hidden");
 $("fallback").innerHTML="<h2>Rendu 3D indisponible</h2><p>Le chargement de la scène 3D a échoué. Vérifie ta connexion Internet et utilise Safari récent sur iPhone.</p><pre>"+escapeHTML(String(ex.message||ex))+"</pre>";
}
