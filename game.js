(() => {
"use strict";

/* Rogue Realms — vanilla JS, static-host friendly. */

const $ = id => document.getElementById(id);
const screens = ["mapScreen","battleScreen","rewardScreen","eventScreen","restScreen","endScreen"];

const ENEMIES = {
  goblin: {id:"goblin", name:"GOBLIN", hp:80, damage:13, sprite:"assets/goblin.svg", furyGain:0, behavior:"aggressive", reward:true},
  tiznado: {id:"tiznado", name:"TIZNADO", hp:105, damage:16, sprite:"assets/tiznado.svg", furyGain:0, behavior:"volatile", reward:true},
  warden: {id:"warden", name:"GUARDIÁN DEL BOSQUE", hp:165, damage:20, sprite:"assets/warden.svg", furyGain:0, behavior:"aggressive", reward:true}
};

const ATTACKS = [
  {id:"golpe", name:"GOLPE", damage:18, cost:0, fury:+10, text:"+10 Furia"},
  {id:"tajo", name:"TAJO PESADO", damage:30, cost:25, fury:0, text:"Golpe poderoso"},
  {id:"stun", name:"GOLPE ATURDIDOR", damage:14, cost:15, fury:+5, stun:1, text:"Aturde 1 turno"},
  {id:"breath", name:"SEGUNDO ALIENTO", heal:22, cost:20, fury:0, text:"Cura 22 HP"}
];

const REWARDS = [
  {id:"strength", title:"FUERZA", desc:"+5 daño base de todos tus ataques."},
  {id:"vitality", title:"VITALIDAD", desc:"+20 HP máximo y recupera 20 HP."},
  {id:"heal", title:"CURACIÓN", desc:"Recupera 35 HP."},
  {id:"furyMax", title:"FURIA MÁXIMA +20", desc:"Aumenta el máximo de Furia en 20."}
];

let state;

function freshState() {
  return {
    run: (Number(localStorage.getItem("rr_runs") || 0) + 1),
    stage: 1, hp:100, maxHp:100, fury:0, maxFury:100, strength:0,
    claimed: new Set(), currentNode:null, map:null, available:[],
    battle:null, locked:false, stunned:false
  };
}

function persistRunCount() { localStorage.setItem("rr_runs", String(state.run)); }

function show(id) {
  screens.forEach(s => $(s).classList.toggle("active", s === id));
}

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }

function generateMap() {
  // 8 layers, 3 lanes. Each layer connects to nearby lanes; boss is final layer.
  const layers = 8, lanes = 3, nodes = [];
  for(let l=0;l<layers;l++){
    for(let lane=0;lane<lanes;lane++){
      let type = "combat";
      if(l===0) type="start";
      else if(l===layers-1) type="boss";
      else {
        const r=Math.random();
        type = r<.15 ? "elite" : r<.32 ? "event" : r<.46 ? "rest" : "combat";
      }
      nodes.push({id:`${l}-${lane}`,layer:l,lane,type,x:120+l*130,y:150+lane*130,connections:[],locked:true});
    }
  }
  // Ensure every node has forward connections, while limiting lane movement to 1.
  for(let l=0;l<layers-1;l++){
    for(let lane=0;lane<lanes;lane++){
      const n=nodes.find(x=>x.id===`${l}-${lane}`);
      const targets=[lane];
      if(lane>0 && Math.random()<.65) targets.push(lane-1);
      if(lane<lanes-1 && Math.random()<.65) targets.push(lane+1);
      [...new Set(targets)].forEach(t=>n.connections.push(`${l+1}-${t}`));
    }
  }
  // Start at middle lane; make boss reachable.
  nodes.forEach(n=>n.locked=n.layer>1 || (n.layer===1 && !nodes.find(s=>s.id==="0-1").connections.includes(n.id)));
  state.map={layers,lanes,nodes};
  state.currentNode="0-1";
  state.available=nodes.find(n=>n.id==="0-1").connections.slice();
  renderMap();
}

function nodeLabel(type){
  return {start:"INICIO",combat:"COMBATE",elite:"ÉLITE",event:"EVENTO",rest:"DESCANSO",boss:"JEFE"}[type];
}

function renderMap(){
  $("runLabel").textContent=`RUN ${state.run}`;
  $("stageLabel").textContent=`STAGE ${state.stage}`;
  $("mapHp").textContent=`${state.hp}/${state.maxHp} HP`;
  $("mapFury").textContent=`${state.fury}/${state.maxFury} FURIA`;
  const svg=$("mapSvg");
  svg.innerHTML="";
  const ns="http://www.w3.org/2000/svg";
  const nodes=state.map.nodes;
  nodes.forEach(n=>{
    n.connections.forEach(cid=>{
      const t=nodes.find(x=>x.id===cid);
      const line=document.createElementNS(ns,"line");
      line.setAttribute("x1",n.x);line.setAttribute("y1",n.y);line.setAttribute("x2",t.x);line.setAttribute("y2",t.y);
      line.setAttribute("class","map-line "+(state.available.includes(t.id)?"available":""));
      svg.appendChild(line);
    });
  });
  nodes.forEach(n=>{
    const g=document.createElementNS(ns,"g");
    let cls=`node ${n.type}`;
    if(n.id===state.currentNode) cls+=" current";
    if(!state.available.includes(n.id) && n.id!==state.currentNode) cls+=" locked";
    g.setAttribute("class",cls);
    const c=document.createElementNS(ns,"circle"); c.setAttribute("cx",n.x);c.setAttribute("cy",n.y);c.setAttribute("r",n.type==="boss"?29:23);
    const text=document.createElementNS(ns,"text"); text.setAttribute("x",n.x);text.setAttribute("y",n.y+48);text.textContent=nodeLabel(n.type);
    g.append(c,text); svg.appendChild(g);
    if(state.available.includes(n.id)) g.addEventListener("click",()=>selectNode(n.id));
  });
}

function selectNode(id){
  if(state.locked || !state.available.includes(id)) return;
  state.locked=true;
  state.currentNode=id;
  const node=state.map.nodes.find(n=>n.id===id);
  state.stage=node.layer+1;
  state.available=[];
  renderMap();
  if(node.type==="combat"||node.type==="elite"||node.type==="boss"){
    const key=node.type==="boss"?"warden":rand(["goblin","tiznado"]);
    startBattle(ENEMIES[key], node.type);
  } else if(node.type==="event") showEvent();
  else if(node.type==="rest") showRest();
}

function unlockNext(){
  const node=state.map.nodes.find(n=>n.id===state.currentNode);
  state.available=node.connections.slice();
  state.locked=false;
  renderMap(); show("mapScreen");
}

function startBattle(enemy, kind){
  state.battle={enemy:{...enemy}, kind, turn:"PLAYER_TURN", stun:0};
  $("enemySprite").src=enemy.sprite;
  $("enemyName").textContent=enemy.name;
  $("battleMessage").textContent=kind==="boss"?"El guardián bloquea el camino final.":"El enemigo se prepara.";
  updateBattleUI();
  show("battleScreen");
}

function updateBattleUI(){
  const b=state.battle;if(!b)return;
  const e=b.enemy;
  $("enemyHpText").textContent=`${e.hp}/${e.maxHp||ENEMIES[e.id].hp} HP`;
  $("enemyHpBar").style.width=`${clamp(e.hp/(e.maxHp||ENEMIES[e.id].hp)*100,0,100)}%`;
  $("heroHpText").textContent=`${state.hp}/${state.maxHp} HP`;
  $("heroHpBar").style.width=`${state.hp/state.maxHp*100}%`;
  $("uiHp").textContent=`${state.hp}/${state.maxHp}`;
  $("uiHpBar").style.width=`${state.hp/state.maxHp*100}%`;
  $("uiFury").textContent=`${state.fury}/${state.maxFury}`;
  $("uiFuryBar").style.width=`${state.fury/state.maxFury*100}%`;
  $("turnBadge").textContent=b.turn;
  $("actions").innerHTML="";
  ATTACKS.forEach(a=>{
    const btn=document.createElement("button");btn.className="attack-btn";
    const insufficient=state.fury<a.cost;
    const healBlocked=a.id==="breath" && state.hp===state.maxHp;
    btn.disabled=b.turn!=="PLAYER_TURN"||insufficient||healBlocked;
    btn.innerHTML=`<b>${a.name}</b><span>${a.heal?`Cura ${a.heal} HP`:a.damage?`Daño ${a.damage+state.strength}`:""}</span><em class="cost">${a.cost?`-${a.cost} F`:""}</em>`;
    btn.addEventListener("click",()=>playerAction(a));
    $("actions").appendChild(btn);
  });
}

function playerAction(a){
  const b=state.battle;
  if(!b||b.turn!=="PLAYER_TURN"||state.locked)return;
  state.locked=true;b.turn="RESOLVING";updateBattleUI();
  setTimeout(()=>{
    state.fury-=a.cost;
    if(a.heal) state.hp=clamp(state.hp+a.heal,0,state.maxHp);
    if(a.damage){
      const dmg=a.damage+state.strength;
      b.enemy.hp=clamp(b.enemy.hp-dmg,0,b.enemy.maxHp||ENEMIES[b.enemy.id].hp);
      $("battleMessage").textContent=`Xavren causa ${dmg} de daño.`;
    } else $("battleMessage").textContent=`Xavren recupera ${a.heal} HP.`;
    state.fury=clamp(state.fury+(a.fury||0),0,state.maxFury);
    if(a.stun) b.stun=1;
    updateBattleUI();
    if(b.enemy.hp<=0){ victory(); return; }
    setTimeout(enemyTurn,650);
  },450);
}

function enemyTurn(){
  const b=state.battle;
  if(!b)return;
  b.turn="ENEMY_TURN";updateBattleUI();
  setTimeout(()=>{
    if(b.stun>0){
      b.stun=0;
      $("battleMessage").textContent=`${b.enemy.name} está aturdido.`;
    } else {
      let dmg=b.enemy.damage;
      if(b.enemy.behavior==="volatile" && Math.random()<.2)dmg+=8;
      state.hp=clamp(state.hp-dmg,0,state.maxHp);
      $("battleMessage").textContent=`${b.enemy.name} causa ${dmg} de daño.`;
    }
    updateBattleUI();
    if(state.hp<=0){ defeat(); return; }
    setTimeout(()=>{b.turn="PLAYER_TURN";state.locked=false;$("battleMessage").textContent="Elige un ataque.";updateBattleUI()},500);
  },500);
}

function victory(){
  const b=state.battle;
  b.turn="VICTORY";state.locked=true;updateBattleUI();
  $("rewardTitle").textContent=b.kind==="boss"?"¡REINO CONQUISTADO!":"Victoria";
  $("rewardSubtitle").textContent=b.kind==="boss"?"Has derrotado al Guardián del Bosque.":"Elige una mejora para continuar.";
  buildRewards();
  setTimeout(()=>show("rewardScreen"),700);
}

function buildRewards(){
  const box=$("rewardChoices");box.innerHTML="";
  const pool=REWARDS.filter(r=>!state.claimed.has(r.id));
  // If all unique rewards are claimed, offer a one-time run heal instead.
  const choices=pool.length?pool.sort(()=>Math.random()-.5).slice(0,3):[{id:"healAgain",title:"RECUPERACIÓN",desc:"Recupera 25 HP."}];
  choices.forEach(r=>{
    const btn=document.createElement("button");btn.className="choice";
    btn.innerHTML=`<h3>${r.title}</h3><p>${r.desc}</p>`;
    btn.addEventListener("click",()=>claimReward(r));
    box.appendChild(btn);
  });
}

function claimReward(r){
  if(state.claimed.has(r.id))return;
  state.claimed.add(r.id);
  if(r.id==="strength")state.strength+=5;
  if(r.id==="vitality"){state.maxHp+=20;state.hp=clamp(state.hp+20,0,state.maxHp)}
  if(r.id==="heal")state.hp=clamp(state.hp+35,0,state.maxHp);
  if(r.id==="furyMax")state.maxFury+=20;
  if(r.id==="healAgain")state.hp=clamp(state.hp+25,0,state.maxHp);
  if(state.battle?.kind==="boss"){endGame(true);return;}
  unlockNext();
}

function showEvent(){
  $("eventTitle").textContent=rand(["Ruinas cubiertas","La senda del cuervo","Mercader errante"]);
  $("eventText").textContent=rand([
    "Encuentras un altar antiguo. Una voz susurra que el poder tiene un precio.",
    "Un viajero herido te ofrece un trato antes de desaparecer entre los árboles.",
    "Entre raíces y piedras descubres un pequeño cofre olvidado."
  ]);
  const box=$("eventChoices");box.innerHTML="";
  [["risk","Arriesgarse","+20 HP, pero pierdes 10 Furia."],["safe","Seguir adelante","Recupera 8 HP."]].forEach(x=>{
    const btn=document.createElement("button");btn.className="choice";btn.innerHTML=`<h3>${x[1]}</h3><p>${x[2]}</p>`;
    btn.onclick=()=>{if(x[0]==="risk"){state.hp=clamp(state.hp+20,0,state.maxHp);state.fury=clamp(state.fury-10,0,state.maxFury)}else state.hp=clamp(state.hp+8,0,state.maxHp);unlockNext()};
    box.appendChild(btn);
  });
  show("eventScreen");
}

function showRest(){ $("restBtn").textContent=`Descansar y recuperar ${Math.min(30,state.maxHp-state.hp)} HP`;show("restScreen"); }
$("restBtn").onclick=()=>{state.hp=clamp(state.hp+30,0,state.maxHp);unlockNext()};

function defeat(){state.battle.turn="DEFEAT";state.locked=true;endGame(false)}
function endGame(win){
  $("endEyebrow").textContent=win?"RUN COMPLETE":"RUN OVER";
  $("endTitle").textContent=win?"Rogue Realms conquistado":"Xavren ha caído";
  $("endText").textContent=win?`Has completado la run ${state.run} y derrotado al jefe final.`:`La run ${state.run} termina en el Stage ${state.stage}.`;
  show("endScreen");
}
function restart(){
  state=freshState();persistRunCount();generateMap();show("mapScreen");
}
$("restartBtn").onclick=restart;$("endRestartBtn").onclick=restart;
restart();
})();