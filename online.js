// ARCHIPEL 2-player server-authoritative multiplayer transport.
// Session is stored locally for reconnecting to an unfinished match.
const API="https://lrmgtnbxujdvswaykyxi.supabase.co/functions/v1/archipel-online";
const PUBLISHABLE="sb_publishable_ppt0OwJ0f1G93qnWGUaH5w_CXOTI0VX";
const STORAGE="archipel-online-session-v1";
export class OnlineClient {
 constructor(){this.session=null;this.timer=null;this.lastRoom=null;this.busy=false;this.stopped=false;}
 static restore(){
  try{const value=JSON.parse(localStorage.getItem(STORAGE)||"null");
   return value&&typeof value.roomId==="string"&&typeof value.token==="string"?value:null;
  }catch{return null}
 }
 remember(session){this.session=session;localStorage.setItem(STORAGE,JSON.stringify(session))}
 clear(){this.stop();this.session=null;localStorage.removeItem(STORAGE)}
 stop(){this.stopped=true;if(this.timer){clearInterval(this.timer);this.timer=null}}
 async call(action,payload={},timeout=15000){
  const body={action,...payload};
  if(this.session&&!["create","join"].includes(action)){
   body.roomId=this.session.roomId;body.token=this.session.token;
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const response=await fetch(API,{method:"POST",mode:"cors",
    headers:{"Content-Type":"application/json","apikey":PUBLISHABLE},
    body:JSON.stringify(body),signal:controller.signal});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||result.error)throw Error(result.error||"Serveur indisponible. Réessaie.");
   return result;
  }catch(e){if(e?.name==="AbortError")throw Error("Le serveur ne répond pas. Réessaie.");throw e}
  finally{clearTimeout(timer)}
 }
 async create(name){
  const data=await this.call("create",{name});
  this.remember({roomId:data.room.id,token:data.token,code:data.room.code});
  return data.room;
 }
 async join(code,name){
  const data=await this.call("join",{code,name});
  this.remember({roomId:data.room.id,token:data.token,code:data.room.code});
  return data.room;
 }
 async get(){return (await this.call("get")).room}
 async act(action,payload={},version){
  const result=await this.call(action,{...payload,version});
  return result;
 }
 watch(onRoom,onError){
  if(this.timer)clearInterval(this.timer);
  this.stopped=false;
  let loading=false;
  const tick=async()=>{
   if(this.stopped||loading||document.visibilityState==="hidden")return;
   loading=true;
   try{const next=await this.get();if(this.stopped)return;
    if(!this.lastRoom||next.version!==this.lastRoom.version){
     this.lastRoom=next;onRoom(next);
    }
   }catch(e){if(!this.stopped)onError(e)}
   finally{loading=false}
  };
  this.timer=setInterval(tick,1450);
  this.visibility=()=>{if(document.visibilityState==="visible")tick()};
  document.addEventListener("visibilitychange",this.visibility);
 }
 dispose(){this.stop();if(this.visibility)document.removeEventListener("visibilitychange",this.visibility);this.visibility=null}
}
export function shareUrl(code){
 const url=new URL(location.href);url.searchParams.set("room",code);url.hash="";
 return url.toString();
}
