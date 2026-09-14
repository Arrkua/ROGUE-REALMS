const $ = id => document.getElementById(id);
const state={level:1,xp:0,xpNext:50,power:0,maxHp:100,hp:100,rage:0,maxRage:100,armor:0,mapIndex:0,enemy:null,stunned:false,pendingLevelUps:0,rewardClaimed:false,zoneCleared:false,turnBusy:false};
const screens={map:$('mapScreen'),battle:$('battleScreen'),reward:$('rewardScreen')};
const pathPool=[
 {t:'fight',icon:'⚔️',name:'COMBATE',desc:'Enemigo normal'},
 {t:'elite',icon:'👹',name:'ÉLITE',desc:'Riesgo · mejor recompensa'},
 {t:'event',icon:'❓',name:'EVENTO',desc:'Una decisión misteriosa'},
 {t:'rest',icon:'💤',name:'DESCANSO',desc:'Recupera 30% de HP'}
];
let pathSerial=1;
const attacks=[
 {name:'Golpe',damage:18,cost:0,gain:10,desc:'Daño directo'},
 {name:'Tajo pesado',damage:30,cost:25,gain:0,desc:'Gran daño'},
 {name:'Golpe aturdidor',damage:14,cost:15,gain:5,desc:'Aturde al enemigo'},
 {name:'Segundo aliento',heal:22,cost:20,gain:0,desc:'Recupera 22 HP'}
];
function updateHud(){ $('level').textContent=state.level; $('xp').textContent=state.xp; $('xpNext').textContent=state.xpNext; $('power').textContent=state.power; $('rage').textContent=state.rage; $('maxRageHud').textContent=state.maxRage; }
function show(s){Object.values(screens).forEach(x=>x.classList.add('hidden'));s.classList.remove('hidden');}
function renderMap(){
 updateHud(); const map=$('map'); map.innerHTML='';
 let choices;
 if(state.zoneCleared){ choices=[{t:'boss',icon:'👑',name:'JEFE',desc:'Guardián de la nueva zona'},{t:'fight',icon:'⚔️',name:'COMBATE',desc:'Prepara tu build'},{t:'rest',icon:'💤',name:'DESCANSO',desc:'Recupera 30% de HP'}]; state.zoneCleared=false; }
 else choices=[0,1,2].map(()=>({...pathPool[Math.floor(Math.random()*pathPool.length)],id:pathSerial++}));
 choices.forEach(n=>{const b=document.createElement('button');b.type='button';b.className='pathChoice '+n.t;b.innerHTML=`<span class="pathIcon">${n.icon}</span><span class="pathType">${n.name}</span><small>${n.desc}</small>`;b.addEventListener('click',()=>selectNode(n));map.appendChild(b);});
}
function finishNode(){renderMap();show(screens.map);}
function selectNode(n){state.mapIndex=n.id;if(n.t==='fight'||n.t==='elite'||n.t==='boss')startBattle(n);else if(n.t==='rest'){state.hp=Math.min(state.maxHp,state.hp+Math.ceil(state.maxHp*.3));$('log').textContent='Descansas y recuperas parte de tu vida.';finishNode();}else{const gain=15+Math.floor(Math.random()*16);state.xp+=gain;checkLevel();$('log').textContent=`Encuentras un antiguo altar. Ganas ${gain} XP.`;finishNode();}}
function startBattle(n){
 const elite=n.t==='elite',boss=n.t==='boss'; const base=boss?{name:'GUARDIÁN ÓSEO',hp:140,dmg:17,xp:40,img:'assets/enemies/skeleton.svg'}:elite?{name:'GOBLIN ÉLITE',hp:105,dmg:15,xp:28,img:'assets/enemies/goblin.svg'}:(Math.random()<.5?{name:'GOBLIN',hp:70,dmg:10,xp:14,img:'assets/enemies/goblin.svg'}:{name:'ESQUELETO',hp:85,dmg:13,xp:18,img:'assets/enemies/skeleton.svg'});
 state.enemy={...base,maxHp:base.hp};state.stunned=false;state.turnBusy=false;$('enemyImg').src=state.enemy.img;$('enemyName').textContent=state.enemy.name;$('log').textContent=`Te enfrentas a ${state.enemy.name}.`;
 show(screens.battle);renderAttacks();updateBattle();
}
function renderAttacks(){
 const box=$('attacks');box.innerHTML='';box.dataset.locked='0';
 attacks.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.className='attack';b.id='attack-'+i;b.innerHTML=`<strong>${a.name}</strong><small>${a.heal?`❤️ ${a.heal} HP`:`⚔️ ${a.damage} daño`} · <span class="cost">🔥 ${a.cost} Furia</span>${a.gain?` · <span class="gain">+${a.gain} Furia` : ''}</span></small><small>${a.desc}</small>`;b.addEventListener('click',()=>playerAttack(i));box.appendChild(b);});updateAttackAvailability();}
function updateAttackAvailability(){document.querySelectorAll('.attack').forEach((b,i)=>b.disabled=state.turnBusy||state.rage<attacks[i].cost||!state.enemy);}
function setAttackLock(v){state.turnBusy=v;updateAttackAvailability();}
function updateBattle(){if(!state.enemy)return; $('playerHpBar').style.width=Math.max(0,state.hp/state.maxHp*100)+'%';$('enemyHpBar').style.width=Math.max(0,state.enemy.hp/state.enemy.maxHp*100)+'%';$('playerHpText').textContent=`${state.hp} / ${state.maxHp} HP`;$('playerRageBar').style.width=Math.max(0,state.rage/state.maxRage*100)+'%';$('playerRageText').textContent=`${state.rage} / ${state.maxRage}`;$('enemyHpText').textContent=`${state.enemy.hp} / ${state.enemy.maxHp} HP`;updateHud();updateAttackAvailability();}
function playerAttack(i){if(state.turnBusy||!state.enemy)return;const a=attacks[i];if(state.rage<a.cost)return;setAttackLock(true);state.rage=Math.max(0,state.rage-a.cost);state.rage=Math.min(state.maxRage,state.rage+a.gain);if(a.heal){state.hp=Math.min(state.maxHp,state.hp+a.heal);$('log').textContent=`Recuperas ${a.heal} HP.`;}else{const dmg=a.damage+state.power;state.enemy.hp=Math.max(0,state.enemy.hp-dmg);state.stunned=i===2;$('log').textContent=`Infliges ${dmg} de daño.`;}updateBattle();if(state.enemy.hp<=0){winBattle();return;}setTimeout(enemyTurn,500);}
function enemyTurn(){if(!state.enemy)return;if(state.stunned){state.stunned=false;$('log').textContent='El enemigo queda aturdido y pierde el turno.';setAttackLock(false);return;}const dmg=Math.max(1,state.enemy.dmg-state.armor);state.hp=Math.max(0,state.hp-dmg);$('log').textContent=`${state.enemy.name} te golpea por ${dmg}.`;updateBattle();if(state.hp<=0){setTimeout(()=>{alert('Has caído. La expedición vuelve a empezar.');resetRun();},200);return;}setAttackLock(false);updateBattle();}
function winBattle(){const e=state.enemy;state.xp+=e.xp;checkLevel();state.enemy=null;setAttackLock(true);if(e.name.includes('GUARDIÁN'))state.zoneCleared=true;setTimeout(()=>showNextReward(e),250);}
function checkLevel(){while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.xpNext=Math.floor(state.xpNext*1.45);state.maxHp+=12;state.hp=state.maxHp;state.pendingLevelUps++;}updateHud();}
function showNextReward(enemy){if(state.pendingLevelUps>0){renderLevelReward();show(screens.reward);}else{renderBattleReward(enemy);show(screens.reward);}}
function renderLevelReward(){const box=$('rewards');box.innerHTML='';$('rewardTitle').textContent='SUBIDA DE NIVEL';$('rewardSubtitle').textContent=`Nivel ${state.level}: elige UNA mejora.`;const opts=[['⚔️','Fuerza +5','Aumenta el daño de todos tus ataques.',()=>state.power+=5],['❤️','Vitalidad +20','Aumenta 20 la vida máxima y te cura.',()=>{state.maxHp+=20;state.hp=Math.min(state.maxHp,state.hp+20)}],['🔥','Furia máxima +20','Aumenta tu límite de Furia.',()=>{state.maxRage+=20;state.rage=state.maxRage}],['🛡️','Fortaleza','Reduce en 2 el daño recibido.',()=>state.armor+=2]];opts.forEach(o=>addRewardButton(o,()=>claimLevel(o[3])));}
function addRewardButton(o,fn){const b=document.createElement('button');b.type='button';b.className='rewardBtn';b.innerHTML=`<strong>${o[0]} ${o[1]}</strong><span>${o[2]}</span>`;b.addEventListener('click',fn);$('rewards').appendChild(b);}
function claimLevel(effect){if(state.rewardClaimed)return;state.rewardClaimed=true;document.querySelectorAll('.rewardBtn').forEach(b=>b.disabled=true);effect();state.pendingLevelUps--;state.rewardClaimed=false;if(state.pendingLevelUps>0){renderLevelReward();}else{$('rewards').innerHTML='';renderMap();show(screens.map);}updateHud();}
function renderBattleReward(enemy){const box=$('rewards');box.innerHTML='';$('rewardTitle').textContent='RECOMPENSA';$('rewardSubtitle').textContent='Elige UNA mejora para tu Guerrero.';const opts=[['⚔️','Fuerza +5','Aumenta el daño de todos tus ataques.',()=>state.power+=5],['❤️','Vitalidad +25','Aumenta la vida máxima y te cura.',()=>{state.maxHp+=25;state.hp=Math.min(state.maxHp,state.hp+25)}],['🩸','Curación +20','Recupera 20 HP ahora.',()=>state.hp=Math.min(state.maxHp,state.hp+20)]];opts.forEach(o=>addRewardButton(o,()=>claimBattle(o[3],enemy)));}
function claimBattle(effect,enemy){if(state.rewardClaimed)return;state.rewardClaimed=true;document.querySelectorAll('.rewardBtn').forEach(b=>b.disabled=true);effect();state.rewardClaimed=false;$('rewards').innerHTML='';if(enemy&&enemy.name.includes('GUARDIÁN'))alert('¡Has derrotado al jefe! El bosque se abre ante ti.');renderMap();show(screens.map);updateHud();}
function resetRun(){Object.assign(state,{level:1,xp:0,xpNext:50,power:0,maxHp:100,hp:100,rage:0,maxRage:100,armor:0,mapIndex:0,enemy:null,stunned:false,pendingLevelUps:0,rewardClaimed:false,zoneCleared:false,turnBusy:false});renderMap();show(screens.map);updateHud();}
renderMap();updateHud();
