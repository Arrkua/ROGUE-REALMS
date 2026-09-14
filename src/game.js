const attacks=[
{name:"Golpe",icon:"⚔",damage:18,desc:"Daño fiable"},
{name:"Tajo pesado",icon:"🪓",damage:30,desc:"Mucho daño"},
{name:"Golpe aturdidor",icon:"💥",damage:14,desc:"Pierde su próximo turno"},
{name:"Segundo aliento",icon:"❤",heal:22,desc:"Recupera 22 HP"}];
const enemies=[
{name:"GOBLIN",image:"assets/enemies/goblin.svg",hp:70,damage:10,xp:14},
{name:"ESQUELETO",image:"assets/enemies/skeleton.svg",hp:85,damage:13,xp:18}];
let s={run:1,room:1,level:1,maxHp:100,hp:100,exp:0,enemy:null,enemyHp:0,enemyMax:0,stunned:false,busy:false,strength:0};
const $=id=>document.getElementById(id);
function newEnemy(){s.enemy=enemies[Math.random()<.5?0:1];s.enemyHp=s.enemyMax=s.enemy.hp;s.stunned=false;s.busy=false;$("enemy-name").textContent=s.enemy.name;$("enemy-sprite").src=s.enemy.image;$("enemy-sprite").alt=s.enemy.name+" pixel art";$("message").textContent=`Un ${s.enemy.name.toLowerCase()} aparece. ¿Qué vas a hacer?`;render()}
function render(){$("run").textContent=`RUN ${s.run} · SALA ${s.room}`;$("level").textContent=`NV. ${s.level}`;$("player-hp").style.width=Math.max(0,s.hp/s.maxHp*100)+"%";$("enemy-hp").style.width=Math.max(0,s.enemyHp/s.enemyMax*100)+"%";$("player-stats").textContent=`${s.hp} / ${s.maxHp} HP · EXP ${s.exp} / 30`;$("enemy-stats").textContent=`${s.enemyHp} / ${s.enemyMax} HP`;const box=$("moves");box.innerHTML="";attacks.forEach((a,i)=>{const b=document.createElement("button");b.className="move";b.disabled=s.busy||s.enemyHp<=0;b.innerHTML=`${a.icon} ${a.name}<span>${a.desc}${a.damage?` · ${a.damage+s.strength} daño`:""}</span>`;b.onclick=()=>playerAttack(i);box.appendChild(b)})}
function flash(cls,id){const el=$(id);el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),180)}
function playerAttack(i){if(s.busy||s.enemyHp<=0)return;s.busy=true;const a=attacks[i];flash("attack","enemy-sprite");if(a.heal){s.hp=Math.min(s.maxHp,s.hp+a.heal);$("message").textContent=`${a.icon} Recuperas ${a.heal} HP.`}else{let d=a.damage+s.strength;if(i===1&&Math.random()<.2)d+=10;s.enemyHp=Math.max(0,s.enemyHp-d);if(i===2)s.stunned=true;$("message").textContent=`${a.icon} ${a.name} hace ${d} de daño.`}render();setTimeout(()=>{if(s.enemyHp<=0)return victory();enemyTurn()},350)}
function enemyTurn(){if(s.stunned){s.stunned=false;s.busy=false;$("message").textContent=`💫 ${s.enemy.name} queda aturdido y pierde el turno.`;render();return}flash("hit","player-hp");let d=s.enemy.damage+(Math.random()<.2?4:0);s.hp=Math.max(0,s.hp-d);$("message").textContent=`${s.enemy.name} te golpea por ${d} de daño.`;if(s.hp<=0)return gameOver();s.busy=false;render()}
function victory(){s.exp+=s.enemy.xp;s.busy=true;$("message").textContent=`🏆 ${s.enemy.name} derrotado. +${s.enemy.xp} EXP.`;render();setTimeout(()=>{if(s.exp>=30){s.exp-=30;s.level++;s.maxHp+=10;s.hp=s.maxHp;showReward()}else nextRoom()},450)}
function showReward(){const r=$("reward");r.classList.remove("hidden");r.innerHTML=`<strong>⭐ NIVEL ${s.level}</strong><p>Elige una mejora para tu próxima sala.</p><button id="vital">❤ Vitalidad — +25 HP máximo</button><button id="power">⚔ Fuerza — +5 daño</button>`;$("vital").onclick=()=>{s.maxHp+=25;s.hp=s.maxHp;nextRoom()};$("power").onclick=()=>{s.strength+=5;nextRoom()};$("moves").innerHTML=""}
function nextRoom(){s.room++;if(s.room>6){s.room=1;s.run++;$("message").textContent="👑 ¡Expedición superada! Nueva run."}newEnemy()}
function gameOver(){s.busy=true;$("moves").innerHTML="";const r=$("reward");r.classList.remove("hidden");r.innerHTML=`<strong>💀 HAS CAÍDO</strong><p>La run termina aquí.</p><button id="restart">🔄 Nueva partida</button>`;$("restart").onclick=()=>{s={run:s.run+1,room:1,level:1,maxHp:100,hp:100,exp:0,enemy:null,enemyHp:0,enemyMax:0,stunned:false,busy:false,strength:0};newEnemy()}}
newEnemy();
