const $ = id => document.getElementById(id);

const state = {
  level: 1, xp: 0, xpNext: 50, power: 0,
  maxHp: 100, hp: 100, rage: 0, maxRage: 100, armor: 0,
  enemy: null, stunned: false, turnBusy: false, combatPhase: 'PLAYER_TURN', battleToken: 0,
  pendingLevelUps: 0, rewardLocked: false, rewardConsumed: false, zoneCleared: false,
  pathSerial: 1
};

const screens = { map: $('mapScreen'), battle: $('battleScreen'), reward: $('rewardScreen') };

const pathPool = [
  {t:'fight', icon:'⚔️', name:'COMBATE', desc:'Enemigo normal'},
  {t:'elite', icon:'👹', name:'ÉLITE', desc:'Riesgo · mejor recompensa'},
  {t:'event', icon:'❓', name:'EVENTO', desc:'Una decisión misteriosa'},
  {t:'rest', icon:'💤', name:'DESCANSO', desc:'Recupera 30% de HP'}
];

const attacks = [
  {name:'Golpe', damage:18, cost:0, gain:10, desc:'Daño directo'},
  {name:'Tajo pesado', damage:30, cost:25, gain:0, desc:'Gran daño'},
  {name:'Golpe aturdidor', damage:14, cost:15, gain:5, desc:'Aturde al enemigo'},
  {name:'Segundo aliento', heal:22, cost:20, gain:0, desc:'Recupera 22 HP'}
];

function updateHud(){
  $('level').textContent=state.level;
  $('xp').textContent=state.xp;
  $('xpNext').textContent=state.xpNext;
  $('power').textContent=state.power;
  $('rage').textContent=state.rage;
  $('maxRageHud').textContent=state.maxRage;
}

function show(screen){
  Object.values(screens).forEach(s=>s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function randomChoices(){
  const pool=[...pathPool];
  const result=[];
  while(result.length<3){
    const idx=Math.floor(Math.random()*pool.length);
    result.push({...pool.splice(idx,1)[0],id:state.pathSerial++});
    if(pool.length===0) pool.push(...pathPool);
  }
  return result;
}

function renderMap(){
  updateHud();
  const map=$('map');
  map.innerHTML='';
  let choices;
  if(state.zoneCleared){
    choices=[
      {t:'boss',icon:'👑',name:'JEFE',desc:'Guardián de la nueva zona',id:state.pathSerial++},
      {t:'fight',icon:'⚔️',name:'COMBATE',desc:'Prepara tu build',id:state.pathSerial++},
      {t:'rest',icon:'💤',name:'DESCANSO',desc:'Recupera 30% de HP',id:state.pathSerial++}
    ];
    state.zoneCleared=false;
  } else choices=randomChoices();

  const positions=['left','center','right'];
  choices.forEach((n,index)=>{
    const route=document.createElement('button');
    route.type='button';
    route.className=`route ${positions[index]}`;
    route.setAttribute('aria-label',n.name);
    route.addEventListener('click',()=>selectNode(n));
    map.appendChild(route);

    const card=document.createElement('button');
    card.type='button';
    card.className=`routeCard ${positions[index]} ${n.t}`;
    card.innerHTML=`<span class="pathIcon">${n.icon}</span><span class="pathType">${n.name}</span><small>${n.desc}</small>`;
    card.addEventListener('click',()=>selectNode(n));
    map.appendChild(card);
  });
}

function selectNode(n){
  if(n.t==='fight'||n.t==='elite'||n.t==='boss') startBattle(n);
  else if(n.t==='rest'){
    state.hp=Math.min(state.maxHp,state.hp+Math.ceil(state.maxHp*.30));
    state.rage=Math.min(state.maxRage,state.rage+15);
    renderMap(); show(screens.map); updateHud();
  } else {
    const gain=15+Math.floor(Math.random()*16);
    state.xp+=gain;
    checkLevelUps();
    if(state.pendingLevelUps>0) showNextLevelReward();
    else { renderMap(); show(screens.map); }
  }
}

function startBattle(node){
  const elite=node.t==='elite', boss=node.t==='boss';
  let base;
  if(boss) base={name:'GUARDIÁN ÓSEO',hp:150,dmg:18,xp:45,img:'assets/enemies/skeleton.svg'};
  else if(elite) base={name:'GOBLIN ÉLITE',hp:105,dmg:15,xp:28,img:'assets/enemies/goblin.svg'};
  else base=Math.random()<.5?{name:'GOBLIN',hp:70,dmg:10,xp:14,img:'assets/enemies/goblin.svg'}:{name:'ESQUELETO',hp:85,dmg:13,xp:18,img:'assets/enemies/skeleton.svg'};

  state.enemy={...base,maxHp:base.hp};
  state.stunned=false;
  state.turnBusy=false;
  state.combatPhase='PLAYER_TURN';
  state.battleToken++;
  state.rewardLocked=false;
  state.rewardConsumed=false;

  $('enemyImg').src=state.enemy.img;
  $('enemyName').textContent=state.enemy.name;
  $('log').textContent=`Te enfrentas a ${state.enemy.name}.`;
  $('battleHint').textContent='TU TURNO · Elige un ataque.';

  show(screens.battle);
  renderAttacks();
  updateBattle();
  setAttackLock(false);
}

function renderAttacks(){
  const box=$('attacks');
  box.innerHTML='';
  attacks.forEach((a,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='attack';
    b.id=`attack-${i}`;
    const actionText=a.heal?`❤️ Cura ${a.heal} HP`:`⚔️ ${a.damage} daño`;
    const resourceText=a.cost>0?`🔥 ${a.cost} Furia`:'🔥 0 Furia';
    const gainText=a.gain?` · <span class="gain">+${a.gain} Furia</span>`:'';
    b.innerHTML=`<strong>${a.name}</strong><small>${actionText} · <span class="cost">${resourceText}</span>${gainText}</small><small>${a.desc}</small>`;
    b.addEventListener('click',()=>playerAttack(i));
    box.appendChild(b);
  });
  updateAttackAvailability();
}

function updateAttackAvailability(){
  const canAct=state.combatPhase==='PLAYER_TURN' && !state.turnBusy && !!state.enemy && state.enemy.hp>0 && state.hp>0;
  document.querySelectorAll('.attack').forEach((button,i)=>{
    const a=attacks[i];
    button.disabled=!canAct || state.rage<a.cost;
  });
}

function setAttackLock(locked){
  state.turnBusy=locked;
  updateAttackAvailability();
}

function beginEnemyTurn(){
  if(state.combatPhase!=='RESOLVING' || !state.enemy || state.enemy.hp<=0 || state.hp<=0) return;
  state.combatPhase='ENEMY_TURN';
  setAttackLock(true);
  $('battleHint').textContent='TURNO ENEMIGO';
  updateBattle();
  const token=state.battleToken;
  setTimeout(()=>enemyTurn(token),450);
}

function updateBattle(){
  if(!state.enemy) return;
  $('playerHpBar').style.width=`${Math.max(0,state.hp/state.maxHp*100)}%`;
  $('enemyHpBar').style.width=`${Math.max(0,state.enemy.hp/state.enemy.maxHp*100)}%`;
  $('playerHpText').textContent=`${state.hp} / ${state.maxHp} HP`;
  $('playerRageBar').style.width=`${Math.max(0,state.rage/state.maxRage*100)}%`;
  $('playerRageText').textContent=`${state.rage} / ${state.maxRage}`;
  $('enemyHpText').textContent=`${state.enemy.hp} / ${state.enemy.maxHp} HP`;
  updateHud();
  updateAttackAvailability();
}

function playerAttack(index){
  if(state.combatPhase!=='PLAYER_TURN' || state.turnBusy || !state.enemy || state.enemy.hp<=0 || state.hp<=0) return;
  const a=attacks[index];
  if(!a || state.rage<a.cost) return;

  state.combatPhase='RESOLVING';
  setAttackLock(true);
  state.rage=Math.max(0,Math.min(state.maxRage,state.rage-a.cost+a.gain));

  if(a.heal){
    state.hp=Math.min(state.maxHp,state.hp+a.heal);
    $('log').textContent=`Recuperas ${a.heal} HP.`;
  } else {
    const damage=a.damage+state.power;
    state.enemy.hp=Math.max(0,state.enemy.hp-damage);
    state.stunned=index===2;
    $('log').textContent=`Infliges ${damage} de daño.`;
  }
  updateBattle();

  if(state.enemy.hp<=0){ winBattle(); return; }
  beginEnemyTurn();
}

function enemyTurn(token){
  if(token!==state.battleToken || !state.enemy || state.combatPhase!=='ENEMY_TURN') return;

  if(state.stunned){
    state.stunned=false;
    $('log').textContent='El enemigo queda aturdido y pierde el turno.';
    state.combatPhase='PLAYER_TURN';
    $('battleHint').textContent='TU TURNO · Elige un ataque.';
    setAttackLock(false);
    updateBattle();
    return;
  }

  const damage=Math.max(1,state.enemy.dmg-state.armor);
  state.hp=Math.max(0,state.hp-damage);
  $('log').textContent=`${state.enemy.name} te golpea por ${damage}.`;
  updateBattle();
  if(state.hp<=0){
    state.combatPhase='DEFEAT';
    setAttackLock(true);
    setTimeout(()=>{ if(token===state.battleToken){ alert('Has caído. La expedición vuelve a empezar.'); resetRun(); } },350);
    return;
  }

  state.combatPhase='PLAYER_TURN';
  $('battleHint').textContent='TU TURNO · Elige un ataque.';
  setAttackLock(false);
  updateBattle();
}

function winBattle(){
  const defeated=state.enemy;
  state.xp+=defeated.xp;
  checkLevelUps();
  if(defeated.name.includes('GUARDIÁN')) state.zoneCleared=true;
  state.combatPhase='VICTORY';
  $('battleHint').textContent='VICTORIA';
  setAttackLock(true);
  state.enemy=null;
  setTimeout(()=>showNextReward(defeated),300);
}

function checkLevelUps(){
  while(state.xp>=state.xpNext){
    state.xp-=state.xpNext;
    state.level++;
    state.xpNext=Math.floor(state.xpNext*1.45);
    state.maxHp+=12;
    state.hp=state.maxHp;
    state.pendingLevelUps++;
  }
  updateHud();
}

function showNextReward(enemy){
  if(state.pendingLevelUps>0) showNextLevelReward();
  else { renderBattleReward(enemy); show(screens.reward); }
}

function showNextLevelReward(){
  renderLevelReward();
  show(screens.reward);
}

function renderLevelReward(){
  const box=$('rewards');
  box.innerHTML='';
  $('rewardTitle').textContent='SUBIDA DE NIVEL';
  $('rewardSubtitle').textContent=`Nivel ${state.level}: elige UNA mejora.`;
  const opts=[
    ['⚔️','Fuerza +5','Aumenta el daño de todos tus ataques.',()=>state.power+=5],
    ['❤️','Vitalidad +20','Aumenta 20 la vida máxima y te cura.',()=>{state.maxHp+=20;state.hp=Math.min(state.maxHp,state.hp+20)}],
    ['🔥','Furia máxima +20','Aumenta tu límite de Furia.',()=>{state.maxRage+=20;state.rage=state.maxRage}],
    ['🛡️','Fortaleza','Reduce en 2 el daño recibido.',()=>state.armor+=2]
  ];
  opts.forEach(o=>addRewardButton(o,()=>claimLevel(o[3])));
}

function addRewardButton(option,handler){
  const b=document.createElement('button');
  b.type='button'; b.className='rewardBtn';
  b.innerHTML=`<strong>${option[0]} ${option[1]}</strong><span>${option[2]}</span>`;
  b.addEventListener('click',handler,{once:false});
  $('rewards').appendChild(b);
}

function claimLevel(effect){
  if(state.rewardLocked || state.rewardConsumed || state.pendingLevelUps<=0) return;
  state.rewardLocked=true;
  state.rewardConsumed=true;
  document.querySelectorAll('.rewardBtn').forEach(b=>b.disabled=true);
  effect();
  state.pendingLevelUps--;
  updateHud();

  if(state.pendingLevelUps>0){
    $('rewards').innerHTML='';
    state.rewardLocked=false;
    state.rewardConsumed=false;
    showNextLevelReward();
  } else {
    $('rewards').innerHTML='';
    renderMap(); show(screens.map);
  }
}

function renderBattleReward(enemy){
  const box=$('rewards');
  box.innerHTML='';
  $('rewardTitle').textContent='RECOMPENSA';
  $('rewardSubtitle').textContent='Elige UNA mejora para tu Guerrero.';
  const opts=[
    ['⚔️','Fuerza +5','Aumenta el daño de todos tus ataques.',()=>state.power+=5],
    ['❤️','Vitalidad +25','Aumenta la vida máxima y te cura.',()=>{state.maxHp+=25;state.hp=Math.min(state.maxHp,state.hp+25)}],
    ['🩸','Curación +20','Recupera 20 HP ahora.',()=>state.hp=Math.min(state.maxHp,state.hp+20)],
    ['🔥','Furia +15','Recupera 15 Furia ahora.',()=>state.rage=Math.min(state.maxRage,state.rage+15)]
  ];
  opts.forEach(o=>addRewardButton(o,()=>claimBattle(o[3],enemy)));
}

function claimBattle(effect,enemy){
  if(state.rewardLocked || state.rewardConsumed) return;
  state.rewardLocked=true;
  state.rewardConsumed=true;
  document.querySelectorAll('.rewardBtn').forEach(b=>b.disabled=true);
  effect();
  $('rewards').innerHTML='';
  renderMap(); show(screens.map); updateHud();
  if(enemy&&enemy.name.includes('GUARDIÁN')) alert('¡Has derrotado al jefe! El bosque se abre ante ti.');
}

function resetRun(){
  Object.assign(state,{level:1,xp:0,xpNext:50,power:0,maxHp:100,hp:100,rage:0,maxRage:100,armor:0,enemy:null,stunned:false,turnBusy:false,combatPhase:'PLAYER_TURN',battleToken:state.battleToken+1,pendingLevelUps:0,rewardLocked:false,rewardConsumed:false,zoneCleared:false,pathSerial:1});
  renderMap(); show(screens.map); updateHud();
}

renderMap();
updateHud();
