// ARCHIPEL V0.6 — collision-free anchorage in water rather than inside an island.
export const ISLAND_VISUAL_RADIUS=1.70;
export function dockOffset(islands,id,player,shipLevel=1){
 const island=islands[id];
 if(!island)throw Error("Unknown island");
 let nearest=null,min=Infinity;
 for(const other of islands){
  if(other.id===id)continue;
  const d=Math.hypot(other.x-island.x,other.z-island.z);
  if(d<min){min=d;nearest=other}
 }
 // The dock faces toward open water, away from the closest neighboring island.
 const vx=nearest?island.x-nearest.x:1,vz=nearest?island.z-nearest.z:1;
 const base=Math.atan2(vz,vx);
 // Boats of opposing players anchored around the same island take separate bays.
 const angle=base+(player===0?-.35:.35);
 const radius=3.50+Math.max(0,shipLevel-1)*.30;
 return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius};
}
export function dockPosition(islands,id,player,shipLevel=1){
 const island=islands[id],delta=dockOffset(islands,id,player,shipLevel);
 return {x:island.x+delta.x,z:island.z+delta.z,clearance:Math.hypot(delta.x,delta.z)-ISLAND_VISUAL_RADIUS};
}
