import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js?.length>10000,'JavaScript source exists');
new vm.Script(js,{filename:'archipel.js'});
assert.ok(html.includes('viewport-fit=cover'));
assert.ok(html.includes('prefers-reduced-motion'));
assert.ok(html.includes('Vélyra')&&html.includes('Auréon'));
const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{
   innerHTML:'',textContent:'',className:'',dataset:{},
   classList:{toggle(){},add(){},remove(){}},
   addEventListener(){},appendChild(){},querySelectorAll(){return []}
 });
 return elements.get(id);
}
const document={getElementById:element,createElement:()=>element('created'+Math.random())};
const context={document,console,Math,setTimeout:()=>1,clearTimeout:()=>{}};
const anchor='reset();\\n})();';
const at=js.lastIndexOf('reset();');
assert.ok(at>0,'game launch found');
const injected=js.slice(0,at)+'reset();globalThis.__test={getState:()=>s,clickIsland,action,endTurn,startTurn,score,owned,connected};'+js.slice(at+'reset();'.length);
vm.runInNewContext(injected,context,{filename:'archipel.js'});
const {getState,clickIsland,action,endTurn,startTurn,score,owned,connected}=context.__test;
const s=getState();
assert.equal(s.phase,'draft');
assert.equal(s.islands.length,10);
assert.equal(new Set(s.islands.map(x=>x.name)).size,10);
assert.equal(s.players.length,2);
for(const island of s.islands){
 assert.ok(island.wood>=1&&island.wood<=3);
 assert.ok(island.stone>=1&&island.stone<=3);
}
for(let i=0;i<10;i++){
 assert.ok(s.edges.filter(e=>e.includes(i)).length>=2,'every island has at least two maritime routes');
 const queue=[i],seen=new Set([i]);
 while(queue.length){const n=queue.shift();for(let k=0;k<10;k++)if(connected(n,k)&&!seen.has(k)){seen.add(k);queue.push(k)}}
 assert.equal(seen.size,10,'all islands connected');
}
action('roll');
assert.ok(s.first===0||s.first===1);
assert.notEqual(s.dice[0],s.dice[1]);
clickIsland(0);
clickIsland(1);
assert.equal(s.phase,'play');
assert.equal(owned(0).length,1);
assert.equal(owned(1).length,1);
assert.equal(s.islands.filter(x=>x.owner===-1).length,8);
assert.ok(s.treasure>=0&&s.islands[s.treasure].owner===-1);
assert.equal(s.current,1-s.first,'second chooser starts');
const current=s.current;
assert.ok(s.players[current].wood>=1);
assert.ok(s.players[current].stone>=1);
const boat=s.players[current].boat;
const neighbor=s.islands.findIndex((tile,index)=>tile.owner===-1&&connected(boat,index));
assert.ok(neighbor>=0,'neighbor neutral');
clickIsland(neighbor);
assert.equal(s.players[current].boat,neighbor);
assert.equal(s.moved,true);
action('colonize');
assert.equal(s.islands[neighbor].owner,current);
assert.equal(s.acted,true);
assert.equal(owned(current).length,2);
assert.equal(score(current),2);
endTurn();
assert.equal(s.players[current].turns,1);
assert.equal(s.current,1-current);
assert.ok(s.players[s.current].wood>0);
s.players[s.current].wood=39;s.players[s.current].stone=39;startTurn();
assert.equal(s.players[s.current].wood,40);
assert.equal(s.players[s.current].stone,40);
assert.ok(s.message.includes('bois'));
console.log('PASS: initial generation, 10 unique islands, connected routes, faction draft, resources, move/colonization, turns, cap, JS syntax');
