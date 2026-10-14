import {createClient} from "npm:@supabase/supabase-js@2.57.4";
import {newGame,rollForStart,chooseStart,navigate,colonize,upgradeShip,upgradeIsland,attack,retreat,finishTurn} from "./game.js";

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8"}});
const bad=(e:string,status=400)=>reply({error:e},status);
const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const random=(n:number)=>crypto.getRandomValues(new Uint8Array(n));
const token=()=>Array.from(random(32),v=>v.toString(16).padStart(2,"0")).join("");
const code=()=>Array.from(random(8),v=>alphabet[v%alphabet.length]).join("");
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,"0")).join("");
const nickname=(v:unknown)=>typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,18):"";
const safeId=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<10?Number(v):null;
const publicGame=(game:any)=>{
 if(!game)return null;
 const s=structuredClone(game);
 // The treasure must remain secret on both phones until it is found.
 s.treasure=null;
 return s;
};
function view(room:any,seat:number){
 const game=publicGame(room.game);
 return {id:room.id,code:room.code,status:room.status,version:room.version,
  yourSeat:seat,host:seat===0,names:[room.host_name,room.guest_name],game,
  lastEvent:room.last_event};
}
async function load(id:string){
 const {data,error}=await db.from("archipel_rooms").select("*").eq("id",id).maybeSingle();
 if(error)throw Error("Impossible d'accéder au salon.");
 return data;
}
async function save(room:any,patch:any){
 const {data,error}=await db.from("archipel_rooms").update({...patch,version:room.version+1,updated_at:new Date().toISOString()})
  .eq("id",room.id).eq("version",room.version).select("*").maybeSingle();
 if(error)throw Error("Sauvegarde momentanément indisponible.");
 if(!data)throw Error("La partie a évolué sur l'autre téléphone. Actualisation nécessaire.");
 return data;
}
function must(ok:boolean,message:string){if(!ok)throw Error(message);}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
 if(req.method!=="POST")return bad("Méthode interdite.",405);
 try{
  const raw=await req.text();
  if(raw.length>12000)return bad("Requête trop volumineuse.",413);
  const body=JSON.parse(raw||"{}");
  const action=String(body.action||"");
  if(action==="create"){
   const name=nickname(body.name);
   must(name.length>=1,"Saisis le nom de ton équipage.");
   const secret=token(),hash=await digest(secret);
   for(let i=0;i<6;i++){
    const joinCode=code();
    const {data,error}=await db.from("archipel_rooms").insert({
     code:joinCode,host_name:name,host_token_hash:hash,status:"waiting"
    }).select("*").single();
    if(!error&&data)return reply({room:view(data,0),token:secret});
    if(error?.code!=="23505")throw Error("Impossible de créer le salon.");
   }
   return bad("Impossible de générer le code du salon.",500);
  }
  if(action==="join"){
   const joinCode=String(body.code||"").trim().toUpperCase();
   const name=nickname(body.name);
   must(/^[A-HJ-NP-Z2-9]{8}$/.test(joinCode),"Code de salon invalide.");
   must(name.length>=1,"Saisis le nom de ton équipage.");
   const {data:room,error}=await db.from("archipel_rooms").select("*").eq("code",joinCode).maybeSingle();
   if(error||!room)return bad("Ce salon n'existe pas.",404);
   must(room.status==="waiting"&&!room.guest_token_hash,"Ce salon a déjà deux joueurs.");
   must(name.toLocaleLowerCase("fr")!==room.host_name.toLocaleLowerCase("fr"),"Choisis un nom différent de celui de l'hôte.");
   const secret=token();
   const updated=await save(room,{guest_name:name,guest_token_hash:await digest(secret),status:"ready",last_event:{type:"joined",player:1}});
   return reply({room:view(updated,1),token:secret});
  }
  const roomId=String(body.roomId||"");
  const sessionToken=String(body.token||"");
  must(/^[a-f0-9-]{36}$/i.test(roomId)&&/^[a-f0-9]{64}$/i.test(sessionToken),"Session non reconnue.");
  const room=await load(roomId);
  if(!room)return bad("Salon introuvable.",404);
  const hashed=await digest(sessionToken);
  const seat=hashed===room.host_token_hash?0:hashed===room.guest_token_hash?1:-1;
  if(seat<0)return bad("Accès refusé à cette partie.",403);
  if(action==="get")return reply({room:view(room,seat)});
  if(body.version!==undefined&&Number(body.version)!==Number(room.version))
   return bad("La partie a évolué sur l'autre téléphone. Actualise avant d'agir.",409);
  if(action==="start"){
   must(seat===0,"Seul l'hôte peut lancer la partie.");
   must(room.status==="ready"&&!!room.guest_name,"Attends que les deux capitaines soient présents.");
   const game=newGame();
   game.players[0].name=room.host_name;
   game.players[1].name=room.guest_name;
   const updated=await save(room,{game,status:"playing",last_event:{type:"start",player:0}});
   return reply({room:view(updated,seat),event:{type:"start"}});
  }
  must(room.status==="playing"&&room.game,"La partie n'a pas encore commencé.");
  const game=structuredClone(room.game);
  const id=safeId(body.island);
  let event:any;
  if(action==="roll"){
   must(seat===0,"Seul l'hôte lance les dés du départ.");
   event=rollForStart(game);
  }else if(action==="choose-start"){
   must(seat===game.chooser,"Ce n'est pas ton choix d'île.");
   must(id!==null,"Île invalide.");
   event=chooseStart(game,id);
  }else if(action==="retreat"){
   must(seat===1-game.current,"Le défenseur choisit son refuge.");
   must(id!==null,"Refuge invalide.");
   event=retreat(game,id);
  }else {
   must(game.stage==="play"&&game.current===seat,"Ce n'est pas ton tour.");
   if(action==="navigate"){must(id!==null,"Île invalide.");event=navigate(game,id);}
   else if(action==="colonize")event=colonize(game);
   else if(action==="upgrade-ship")event=upgradeShip(game);
   else if(action==="upgrade-island")event=upgradeIsland(game);
   else if(action==="attack"){must(id!==null,"Île invalide.");event=attack(game,id);}
   else if(action==="finish-turn")event=finishTurn(game);
   else return bad("Action inconnue.");
  }
  const updated=await save(room,{game,status:game.stage==="ended"?"finished":"playing",last_event:event});
  return reply({room:view(updated,seat),event});
 }catch(error){
  const msg=error instanceof Error?error.message:"Erreur de serveur.";
  const status=msg.includes("évolué")?409:msg.includes("pas ton")||msg.includes("Seul")||msg.includes("défenseur")?403:400;
  return bad(msg,status);
 }
});