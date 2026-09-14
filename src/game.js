const $ = id => document.getElementById(id);

const state = {
  level: 1, xp: 0, xpNext: 50, power: 0,
  maxHp: 100, hp: 100, rage: 0, maxRage: 100,
  mapIndex: 0, unlocked: [0], cleared: [],
  enemy: null, turn: 0, stunned: false,
  pendingLevelUps: 0, rewardClaimed: false, zoneCleared:false
};

const screens = { map: $('mapScreen'), battle: $('battleScreen'), reward: $('rewardScreen') };

// Each step offers three visible paths in the forest. After choosing one, the game returns here.
const pathPool = [
  {t:'fight',icon:'⚔️',name:'COMBATE',desc:'Enemigo normal'},
  {t:'elite',icon:'👹',name:'ÉLITE',desc:'Riesgo · mejor recompensa'},
  {t:'event',icon:'❓',name:'EVENTO',desc:'Una decisión misteriosa'},
  {t:'rest',icon:'💤',name:'DESCANSO',desc:'Recupera 30% de HP'},
  {t:'fight',icon:'⚔️',name:'COMBATE',desc:'Enemigo normal'},
  {t:'elite',icon:'👹',name:'ÉLITE',desc:'Riesgo · mejor recompensa'}
];
let pathSerial=1;

function updateHud(){
  $('level').textContent=state.level;
  $('xp').textContent=state.xp;
  $('xpNext').textContent=state.xpNext;
  $('power').textContent=state.power; $('rage').textContent=state.rage;
}
function show(screen){Object.values(screens).forEach(s=>s.classList.add('hidden'));screen.classList.remove('hidden');}
function unlockFrom(id){(links[id]||[]).forEach(x=>{if(!state.unlocked.includes(x))state.unlocked.push(x);});}

function renderMap(){
  updateHud();
  const m=$('map'); m.innerHTML='';
  let choices;
  if(state.zoneCleared){
    choices=[{t:'boss',icon:'👑',name:'JEFE',desc:'Guardián de la nueva zona'}, {t:'fight',icon:'⚔️',name:'COMBATE',desc:'Prepara tu build'}, {t:'rest',icon:'💤',name:'DESCANSO',desc:'Recupera 30% de HP'}];
    state.zoneCleared=false;
  } else {
    choices=[0,1,2].map(()=>({...pathPool[Math.floor(Math.random()*pathPool.length)],id:pathSerial++}));
  }
  choices.forEach(n=>{
    const b=document.createElement('button');
    b.className=`pathChoice ${n.t}`;
    b.innerHTML=`<span class="pathIcon">${n.icon}</span><span class="pathType">${n.name}</span><small>${n.desc}</small>`;
    b.onclick=()=>selectNode(n);
    m.appendChild(b);
  });
}

function selectNode(n){
  state.mapIndex=n.id;
  if(n.t==='fight'||n.t==='elite'||n.t==='boss') startBattle(n);
  else if(n.t==='rest'){
    state.hp=Math.min(state.maxHp,state.hp+Math.ceil(state.maxHp*.3));
    finishNode(n.id); $('log').textContent='Descansas y recuperas parte de tu vida.'; renderMap();
  } else if(n.t==='event'){
    const gain=15+Math.floor(Math.random()*16);
    state.xp+=gain; checkLevel(); finishNode(n.id);
    showEventMessage(`Encuentras un antiguo altar. Ganas ${gain} XP.`);
  }
}
function finishNode(id){if(!state.cleared.includes(id))state.cleared.push(id);}
function showEventMessage(text){
  // Non-blocking message; it never creates a second reward button.
  $('log').textContent=text;
  renderMap();
}

function startBattle(n){
  const elite=n.t==='elite', boss=n.t==='boss';
  const base=boss?{name:'GUARDIÁN ÓSEO',hp:140,dmg:17,xp:40,img:'assets/enemies/skeleton.svg'}:
    elite?{name:'GOBLIN ÉLITE',hp:105,dmg:15,xp:28,img:'assets/enemies/goblin.svg'}:
    (Math.random()<.5?{name:'GOBLIN',hp:70,dmg:10,xp:14,img:'assets/enemies/goblin.svg'}:{name:'ESQUELETO',hp:85,dmg:13,xp:18,img:'assets/enemies/skeleton.svg'});
  state.enemy={...base,maxHp:base.hp}; state.turn=0; state.stunned=false;
  $('enemyImg').src=state.enemy.img; $('enemyName').textContent=state.enemy.name;
  show(screens.battle); updateBattle(); renderAttacks(); $('log').textContent=`Te enfrentas a ${state.enemy.name}.`;
}

const attacks=[
  {name:'Golpe',damage:18,cost:0,gain:10,desc:'Daño directo · genera Furia'},
  {name:'Tajo pesado',damage:30,cost:25,gain:0,desc:'Gran daño'},
  {name:'Golpe aturdidor',damage:14,cost:15,gain:5,desc:'Aturde al enemigo'},
  {name:'Segundo aliento',heal:22,cost:20,gain:0,desc:'Recupera 22 HP'}
];
function renderAttacks(){
  const box=$('attacks'); box.innerHTML='';
  attacks.forEach((a,i)=>{
    const b=document.createElement('button'); b.className='attack';
    b.innerHTML=`${a.name}<small>${a.heal?`Curación ${a.heal}`:`${a.damage} daño`} · <span class="cost">🔥 ${a.cost} Furia</span>${a.gain?` · <span class="gain">+${a.gain} al golpear</span>`:''}</small><small>${a.desc}</small>`;
    b.onclick=()=>playerAttack(i); box.appendChild(b);
  });
  updateAttackAvailability();
}
function updateAttackAvailability(){
  document.querySelectorAll('#attacks .attack').forEach((b,i)=>{b.disabled=state.rage<attacks[i].cost || $('attacks').dataset.locked==='1';});
}
function setAttacksDisabled(disabled){document.querySelectorAll('#attacks .attack').forEach(b=>b.disabled=disabled);}
function updateBattle(){
  const p=Math.max(0,state.hp/state.maxHp*100),e=state.enemy?Math.max(0,state.enemy.hp/state.enemy.maxHp*100):0;
  $('playerHpBar').style.width=p+'%'; $('enemyHpBar').style.width=e+'%';
  $('playerHpText').textContent=`${state.hp} / ${state.maxHp} HP`;
  $('playerRageBar').style.width=Math.max(0,state.rage/state.maxRage*100)+'%';
  $('playerRageText').textContent=`${state.rage} / ${state.maxRage}`;
  $('enemyHpText').textContent=state.enemy?`${state.enemy.hp} / ${state.enemy.maxHp} HP`:''; updateHud();
}
function playerAttack(i){
  if(!state.enemy||$('attacks').dataset.locked==='1')return;
  const a=attacks[i];
  if(state.rage<a.cost)return;
  state.rage=Math.max(0,state.rage-a.cost);
  state.rage=Math.min(state.maxRage,state.rage+a.gain);
  if(a.heal){state.hp=Math.min(state.maxHp,state.hp+a.heal);$('log').textContent=`Recuperas ${a.heal} HP.`;}
  else{const dmg=a.damage+state.power;state.enemy.hp=Math.max(0,state.enemy.hp-dmg);state.stunned=i===2;$('log').textContent=`Infliges ${dmg} de daño.`;}
  updateBattle();
  if(state.enemy.hp<=0){winBattle();return;}
  setAttacksDisabled(true); setTimeout(()=>{enemyTurn(); if(state.enemy){setAttacksDisabled(false);updateAttackAvailability();}},450);
}
function enemyTurn(){
  if(!state.enemy)return;
  if(state.stunned){state.stunned=false;$('log').textContent='El enemigo queda aturdido y pierde el turno.';return;}
  const dmg=Math.max(1,state.enemy.dmg-(state.armor||0));state.hp=Math.max(0,state.hp-dmg);$('log').textContent=`${state.enemy.name} te golpea por ${dmg}.`;updateBattle();
  if(state.hp<=0)setTimeout(()=>{alert('Has caído. La expedición vuelve a empezar.');resetRun();},250);
}

function winBattle(){
  if(!state.enemy)return;
  const e=state.enemy; state.xp+=e.xp; checkLevel(); finishNode(state.mapIndex);
  state.enemy=null; state.rewardClaimed=false; $('attacks').dataset.locked='1'; setAttacksDisabled(true);
  setTimeout(()=>showNextReward(e),250);
}

function checkLevel(){
  while(state.xp>=state.xpNext){
    state.xp-=state.xpNext; state.level++; state.xpNext=Math.floor(state.xpNext*1.45);
    state.maxHp+=12; state.hp=state.maxHp; state.pendingLevelUps++;
  }
  updateHud();
}

function showNextReward(enemy){
  if(state.pendingLevelUps>0){renderLevelUpReward();show(screens.reward);return;}
  renderBattleReward(enemy);show(screens.reward);
}

// LEVEL-UP FIX: one pending level = one choice. After the choice the buttons are
// destroyed/disabled, the pending level is consumed, and the panel is rebuilt or closed.
function renderLevelUpReward(){
  const box=$('rewards'); box.innerHTML=''; $('rewardTitle').textContent='SUBIDA DE NIVEL'; $('rewardSubtitle').textContent=`Nivel ${state.level}: elige UNA mejora.`;
  const options=[
    ['⚔️','Fuerza +5','Aumenta el daño de todos tus ataques.',()=>state.power+=5],
    ['❤️','Vitalidad +20','Aumenta 20 la vida máxima y te cura.',()=>{state.maxHp+=20;state.hp=Math.min(state.maxHp,state.hp+20)}],
    ['🔥','Furia máxima +20','Aumenta tu límite de Furia en 20 y llena la nueva capacidad.',()=>{state.maxRage+=20;state.rage=state.maxRage}],
    ['🛡️','Fortaleza','Reduce en 2 el daño recibido.',()=>state.armor=(state.armor||0)+2]
  ];
  options.forEach(o=>{
    const b=document.createElement('button');b.className='rewardBtn';
    b.innerHTML=`<strong>${o[0]} ${o[1]}</strong><span>${o[2]}</span>`;
    b.onclick=()=>claimLevelReward(o[3]); box.appendChild(b);
  });
}
function claimLevelReward(effect){
  if(state.rewardClaimed)return;
  state.rewardClaimed=true;
  document.querySelectorAll('#rewards .rewardBtn').forEach(b=>b.disabled=true);
  effect(); state.pendingLevelUps--; state.rewardClaimed=false; updateHud();
  if(state.pendingLevelUps>0){renderLevelUpReward();return;}
  $('rewards').innerHTML=''; show(screens.map); renderMap();
}

function renderBattleReward(enemy){
  const box=$('rewards'); box.innerHTML=''; $('rewardTitle').textContent='RECOMPENSA'; $('rewardSubtitle').textContent='Elige UNA mejora para tu Guerrero.';
  const options=[
    ['⚔️','Fuerza +5','Aumenta el daño de todos tus ataques.',()=>state.power+=5],
    ['❤️','Vitalidad +25','Aumenta la vida máxima y te cura 25 HP.',()=>{state.maxHp+=25;state.hp=Math.min(state.maxHp,state.hp+25)}],
    ['🩸','Curación +20','Recupera 20 HP ahora.',()=>state.hp=Math.min(state.maxHp,state.hp+20)]
  ];
  options.forEach(o=>{
    const b=document.createElement('button');b.className='rewardBtn';
    b.innerHTML=`<strong>${o[0]} ${o[1]}</strong><span>${o[2]}</span>`;
    b.onclick=()=>claimBattleReward(o[3],enemy); box.appendChild(b);
  });
}
function claimBattleReward(effect,enemy){
  if(state.rewardClaimed)return;
  state.rewardClaimed=true;
  document.querySelectorAll('#rewards .rewardBtn').forEach(b=>b.disabled=true);
  effect(); $('rewards').innerHTML=''; state.rewardClaimed=false;
  if(enemy && enemy.name.includes('GUARDIÁN')){state.zoneCleared=true; alert('¡Has derrotado al jefe! El bosque se abre ante ti.');}
  show(screens.map);renderMap();
}

function resetRun(){
  Object.assign(state,{level:1,xp:0,xpNext:50,power:0,maxHp:100,hp:100,rage:0,maxRage:100,mapIndex:0,unlocked:[0],cleared:[],enemy:null,turn:0,stunned:false,pendingLevelUps:0,rewardClaimed:false,armor:0,zoneCleared:false});
  $('attacks').dataset.locked='0';renderMap();show(screens.map);updateHud();
}

state.armor=0;
renderMap();updateHud();
