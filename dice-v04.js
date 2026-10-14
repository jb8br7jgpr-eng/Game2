// ARCHIPEL v0.4 – animated 3D CSS die, six proper pip faces.
// Result is chosen by the game rules. Animation reveals, never changes, the result.
const layout={
 1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]
};
const slots=[["front",1],["back",6],["right",3],["left",4],["top",2],["bottom",5]];
const endFace={
 1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]
};
function createCube(value,faction){
 const parent=document.createElement("div");
 parent.className="die-world "+(faction===0?"die-v":"die-a");
 parent.setAttribute("aria-label","Dé à six faces, résultat "+value);
 parent.innerHTML='<div class="die-object">'+slots.map(([side,n])=>
  '<div class="die-face '+side+'" aria-hidden="true">'+
  Array.from({length:9},(_,i)=>'<i class="pip'+(layout[n].includes(i)?" filled":"")+'"></i>').join("")+
  '</div>').join("")+'</div><span class="die-player">'+(faction===0?"VÉLYRA":"AURÉON")+'</span>';
 return parent;
}
export async function animateDice(container,values,factions=[0,1]){
 container.replaceChildren();
 container.classList.add("dice-3d-stage");
 const cubes=values.map((n,i)=>{
  const parent=createCube(n,factions[i]??i);
  container.appendChild(parent);
  return parent.querySelector(".die-object");
 });
 if(values.length===2){
  const sep=document.createElement("span");sep.className="die-duel";sep.textContent="VS";
  container.insertBefore(sep,container.children[1]);
 }
 if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
  cubes.forEach((cube,i)=>{
   cube.style.transform="rotateX(20deg) rotateY(-35deg) rotateZ(9deg)";
   cube.style.transition="none";
  });
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  cubes.forEach((cube,i)=>{
   const [x,y]=endFace[values[i]];
   cube.style.transition="transform 1.48s cubic-bezier(.18,.70,.13,1.0)";
   cube.style.transform="rotateX("+(1080+x)+"deg) rotateY("+(1080+y)+"deg)";
  });
  await new Promise(resolve=>setTimeout(resolve,1510));
 }else{
  cubes.forEach((cube,i)=>{const [x,y]=endFace[values[i]];cube.style.transform="rotateX("+x+"deg) rotateY("+y+"deg)"});
 }
 container.classList.add("dice-settled");
 return values;
}
