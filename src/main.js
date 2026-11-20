import './style.css';
import * as THREE from 'three';
import { Simulation } from './sim/simulation.js';
import { LanternWorld } from './view/world.js';
import { LanternAudio } from './view/audio.js';
import { CONFIG, distanceXZ } from './sim/config.js';

const $=(id)=>document.getElementById(id);
const canvas=$('game'),hud=$('hud'),screen=$('screen'),screenTitle=$('screen-title'),screenKicker=$('screen-kicker'),screenCopy=$('screen-copy'),screenExtra=$('screen-extra'),screenActions=$('screen-actions');
const world=new LanternWorld(canvas),audio=new LanternAudio();
const keys=new Set();let sim=null,mode='menu',currentNight=1,totalScore=0,runStart=0,acc=0,lastTime=performance.now(),yaw=0,mouseDown=false,pauseTap=false,toastTimer=0,lastCountdownSecond=-1,lastWindCycle=0,settings={sensitivity:Number(localStorage.getItem('lantern-sensitivity')??.002),colorblind:localStorage.getItem('lantern-colorblind')==='true'};
window.__lanternYaw=yaw;world.setColorblind(settings.colorblind);document.body.classList.toggle('colorblind',settings.colorblind);

const names={1:'Đảo Bến',2:'Đảo Cau',3:'Đảo Chuông'};
function btn(label,fn,primary=true){const b=document.createElement('button');b.className=`btn ${primary?'btn-primary':'btn-secondary'}`;b.textContent=label;b.addEventListener('click',(e)=>{e.stopPropagation();audio.start();fn();});return b;}
function showScreen(kind,extra=''){
  // Release the gameplay pointer lock so overlay buttons remain clickable after a night ends or pauses.
  if(kind!=='playing'&&document.pointerLockElement===canvas)document.exitPointerLock?.();
  const previousMode=mode;
  if(kind==='settings')settings.returnTo=previousMode==='pause'?'pause':'menu';
  mode=kind;screen.classList.remove('hidden');hud.classList.add('hidden');screenActions.replaceChildren();screenExtra.replaceChildren();
  const settingsBtn=(text,cb)=>screenActions.append(btn(text,cb,false));
  if(kind==='menu'){
    screenKicker.textContent='CHUYỆN KỂ GIỮA BIỂN MÂY';screenTitle.innerHTML='Đảo Đèn<br><em>Lồng</em>';screenCopy.textContent='Sương đen đang phủ kín đảo. Hãy gom đom đóm, thắp lại đèn và đưa bình minh trở về.';
    screenExtra.innerHTML='<span class="badge">3 ĐÊM</span><span class="badge">3 HÒN ĐẢO</span><span class="badge">MỘT CHUYẾN PHIÊU LƯU</span>';
    screenActions.append(btn('Bắt đầu hành trình　→',()=>showScreen('intro')));settingsBtn('Cài đặt',()=>showScreen('settings'));
  }else if(kind==='intro'){
    const n=currentNight;screenKicker.textContent=`ĐÊM ${n} · ${names[n].toUpperCase()}`;screenTitle.innerHTML=n===3?'Nơi chuông<br><em>ngủ quên</em>':n===2?'Qua biển<br><em>mây</em>':'Đêm đầu<br><em>trên đảo</em>';
    screenCopy.textContent=n===1?'Ông Đăng trao cho Mây chiếc đèn nhỏ. Hãy gom đom đóm, thắp đèn và giữ ít nhất 3 ngọn sáng tới bình minh.':n===2?'Hai hòn đảo được nối bằng cầu tre. Gió Lạc đã thức giấc; hãy tìm bùa gió và giữ ít nhất 4 đèn sáng tới bình minh.':'Trên đảo chuông, những tầng cao khuất trong sương. Hãy để ý gió và giữ ít nhất 5 trong 7 đèn sáng tới bình minh.';
    screenExtra.innerHTML=`<span class="badge">${CONFIG.nights[n].seconds/60} PHÚT</span><span class="badge">${CONFIG.nights[n].lanterns.length} ĐÈN LỒNG</span>`;
    screenActions.append(btn('Thắp đèn thôi　→',()=>startNight(n)));settingsBtn('Về menu',()=>showScreen('menu'));
  }else if(kind==='pause'){
    screenKicker.textContent=`ĐÊM ${currentNight} · ${names[currentNight].toUpperCase()}`;screenTitle.innerHTML='Dừng lại<br><em>một chút</em>';screenCopy.textContent='Đom đom vẫn sáng. Đảo chờ bạn quay lại.';screenActions.append(btn('Tiếp tục　→',resumeGame));settingsBtn('Chơi lại đêm',()=>startNight(currentNight));settingsBtn('Cài đặt',()=>showScreen('settings'));settingsBtn('Về menu',()=>showScreen('menu'));
  }else if(kind==='settings'){
    screenKicker.textContent='TÙY CHỈNH';screenTitle.innerHTML='Cài đặt<br><em>ánh sáng</em>';screenCopy.textContent='Thay đổi này được lưu trên trình duyệt bạn đang dùng.';
    const volume=Number(localStorage.getItem('lantern-volume')??.32),sens=settings.sensitivity;
    screenExtra.innerHTML=`<label class="setting-row">Âm lượng <input id="volume-setting" type="range" min="0" max="1" step="0.01" value="${volume}"></label><label class="setting-row">Độ nhạy chuột <input id="sens-setting" type="range" min="0.0008" max="0.006" step="0.0001" value="${sens}"></label><label class="setting-row">Bảng màu dễ phân biệt <input id="colorblind-setting" type="checkbox" ${settings.colorblind?'checked':''}></label>`;
    screenActions.append(btn('Lưu và quay lại',()=>{settings.sensitivity=Number($('sens-setting').value);settings.colorblind=$('colorblind-setting').checked;localStorage.setItem('lantern-sensitivity',String(settings.sensitivity));localStorage.setItem('lantern-colorblind',String(settings.colorblind));world.setColorblind(settings.colorblind);document.body.classList.toggle('colorblind',settings.colorblind);showScreen(settings.returnTo??'menu');}));
    $('volume-setting').addEventListener('input',(e)=>audio.setVolume(e.target.value));$('sens-setting').addEventListener('input',(e)=>settings.sensitivity=Number(e.target.value));
  }else if(kind==='result'){
    const won=sim?.state==='won';screenKicker.textContent=won?'ÁNH SÁNG ĐÃ TRỞ VỀ':'SƯƠNG ĐEN KÉO ĐẾN';
    screenTitle.innerHTML=won?'Bình minh<br><em>đã lên</em>':'Đêm nay<br><em>khép lại</em>';
    screenCopy.textContent=won?(currentNight===3?'Tiếng chuông ngân qua biển mây. Mây đã đưa bình minh về đảo.':'Mây đã giữ đủ đèn sáng tới bình minh. Đêm tiếp theo đang chờ.'):(sim?.state==='lost'&&sim?.lanterns.filter(l=>l.lit).length<Math.ceil(.6*sim.lanterns.length)&&sim?.player.flames>0?'Bình minh đã tới nhưng chưa đủ đèn còn sáng. Hãy châm dầu hoặc thắp lại đèn yếu.':'Mây cần nghỉ một chút. Đêm này vẫn có thể bắt đầu lại.');
    screenExtra.innerHTML=`<div class="menu-list"><div class="menu-row"><span>Đêm ${currentNight} · ${names[currentNight]}</span><strong>${sim?.score??0} điểm</strong></div><div class="menu-row"><span>Đèn còn sáng</span><strong>${sim?.lanterns.filter(l=>l.lit).length??0} / ${sim?.lanterns.length??0}</strong></div>${currentNight===3&&won?`<div class="menu-row"><span>Tổng điểm hành trình</span><strong>${totalScore.toLocaleString('vi-VN')} điểm</strong></div>`:''}</div>`;
    if(won&&currentNight<3)screenActions.append(btn('Qua đêm tiếp theo　→',()=>{currentNight++;showScreen('intro');}));
    else if(won)screenActions.append(btn('Chơi lại hành trình',()=>{currentNight=1;totalScore=0;showScreen('intro');}));
    else screenActions.append(btn('Thử lại đêm này　↻',()=>startNight(currentNight)));
    settingsBtn('Về menu',()=>{currentNight=1;totalScore=0;showScreen('menu');});
  }
  canvas.style.cursor=kind==='playing'?'none':'default';
}

function startNight(n){currentNight=n;sim=new Simulation({seed:(Date.now()>>>0),night:n});sim.score=0;acc=0;runStart=performance.now();lastCountdownSecond=-1;lastWindCycle=0;yaw=0;window.__lanternYaw=yaw;world.build(n);world.sync(sim.snapshot(),1/60);audio.start();screen.classList.add('hidden');hud.classList.remove('hidden');mode='playing';canvas.style.cursor='none';}
function resumeGame(){if(!sim)return;pauseTap=true;mode='playing';screen.classList.add('hidden');hud.classList.remove('hidden');}
function triggerPause(){if(mode==='playing'){pauseTap=true;}else if(mode==='pause'){resumeGame();}else if(mode==='result'){return;}}
window.addEventListener('keydown',(e)=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(e.code==='Escape'||e.code==='KeyP'){if(mode==='playing'||mode==='pause')triggerPause();}});
window.addEventListener('keyup',(e)=>keys.delete(e.code));
canvas.addEventListener('click',()=>{if(mode==='playing'&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.();});
document.addEventListener('mousemove',(e)=>{if(mode==='playing'&&document.pointerLockElement===canvas){yaw-=e.movementX*settings.sensitivity;window.__lanternYaw=yaw;}});
document.addEventListener('pointerlockchange',()=>{mouseDown=document.pointerLockElement===canvas;});
function liveInput(){const move=[(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)];const f={move,cam_yaw_deg:yaw*180/Math.PI,jump:keys.has('Space'),interact:keys.has('KeyE'),pulse:keys.has('KeyQ'),dash:keys.has('ShiftLeft')||keys.has('ShiftRight'),pause:pauseTap};pauseTap=false;return f;}

const inventory=$('inventory');for(let i=0;i<20;i++){const slot=document.createElement('i');slot.className='mote-slot';inventory.append(slot);}
let lastState=null,shownEvents=new Set();
function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1550);}
const eventText={mote_picked:'Đom đóm đã về bên bạn',deposit:'Ánh sáng được gửi vào đèn',refuel:'Đã châm thêm dầu',lantern_lit:'Một ngọn đèn đã thức giấc',lantern_out:'Một ngọn đèn vừa cạn dầu',pulse:'Tỏa sáng!',player_hit:'Mây mất một Ngọn Lửa',shade_spawned:'Bóng Mực vừa xuất hiện',charm_picked:'Bùa Gió đang phát sáng',drifter_steal:'Gió Lạc lấy mất đom đóm',drifter_drop:'Đom đóm được trả lại',dash:'Lướt đi!'};
function processEvents(events){for(const e of events){audio.event(e.name);const msg=eventText[e.name];if(msg)toast(msg);}}
function acceptsFuel(l){return !l.lit||l.fuel<100;}
function nearestLantern(state){return state.lanterns.filter(acceptsFuel).sort((a,b)=>distanceXZ(state.player.pos,a.pos)-distanceXZ(state.player.pos,b.pos)||a.id.localeCompare(b.id))[0];}
function updateHud(state){
  $('night-label').textContent=`ĐÊM ${state.night} · ${names[state.night].toUpperCase()}`;
  $('flames').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<state.player.flames?'':'flame-off'}">✦</span>`).join('');
  const s=Math.max(0,Math.ceil(state.time_left_s));$('timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;$('timer').parentElement.classList.toggle('danger',s<=30);
  const lit=state.lanterns.filter(l=>l.lit).length,needed=Math.ceil(.6*state.lanterns.length);$('lantern-count').textContent=lit;$('lantern-total').textContent=state.lanterns.length;$('score').textContent=(totalScore+state.score).toLocaleString('vi-VN');$('inventory-label').textContent=`${state.player.carried} / ${state.player.capacity}`;$('objective').textContent=`Giữ ít nhất ${needed} / ${state.lanterns.length} đèn sáng tới bình minh`;
  [...inventory.children].forEach((x,i)=>{x.classList.toggle('full',i<state.player.carried);x.classList.toggle('locked',i>=state.player.capacity);});
  const dashCd=state.player.dash_cd_s,pulseCd=state.player.pulse_cd_s;$('dash-ability').querySelector('.cooldown').style.transform=`scaleX(${Math.min(1,dashCd/1.5)})`;$('pulse-ability').querySelector('.cooldown').style.transform=`scaleX(${Math.min(1,pulseCd/3)})`;
  const near=state.lanterns.filter(l=>acceptsFuel(l)&&distanceXZ(state.player.pos,l.pos)<=CONFIG.interactRadius).sort((a,b)=>distanceXZ(state.player.pos,a.pos)-distanceXZ(state.player.pos,b.pos)||a.id.localeCompare(b.id))[0];
  $('interact-prompt').classList.toggle('hidden',!near);if(near){$('interact-action').textContent=near.lit?'Châm dầu':near.ever_lit?'Thắp lại':'Thắp sáng';$('deposit-progress').textContent=near.lit?`${near.fuel.toFixed(1)} / 100`:`${state.player.carried} / ${near.ever_lit?5:10}`;}
  const target=nearestLantern(state),arrow=$('target-arrow');
  if(target&&!near){const projected=new THREE.Vector3(...target.pos).project(world.camera);const outside=projected.z>1||Math.abs(projected.x)>.82||Math.abs(projected.y)>.72;arrow.classList.toggle('hidden',!outside);if(outside){const x=Math.max(8,Math.min(92,50+projected.x*42)),y=Math.max(16,Math.min(78,50-projected.y*38));arrow.style.left=`${x}%`;arrow.style.top=`${y}%`;arrow.querySelector('span').style.transform=`rotate(${Math.atan2(projected.y,projected.x)*180/Math.PI}deg)`;}}else arrow.classList.add('hidden');
  const activeWind=state.wind?.active;$('wind-label').classList.toggle('hidden',!activeWind);$('wind-warning').classList.toggle('hidden',!(state.night===3&&state.sim_tick%1800<120&&state.sim_tick>0));
  if(state.time_left_s<=10&&state.time_left_s>0&&s!==lastCountdownSecond){lastCountdownSecond=s;audio.countdown(s);}
  if(state.night===3&&state.sim_tick>=1800){const cycle=Math.floor(state.sim_tick/1800);if(cycle>lastWindCycle){lastWindCycle=cycle;audio.event('wind_warning');}}
}

function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
    if(mode==='playing'&&sim){acc+=dt;let steps=0;while(acc>=1/60&&steps<8){const wasGrounded=sim.player.grounded;sim.step(liveInput());if(wasGrounded&&!sim.player.grounded&&sim.player.vel[1]>0)audio.event('jump');const events=sim.drainEvents();processEvents(events);acc-=1/60;steps++;if(sim.state==='paused'){mode='pause';showScreen('pause');break;}if(sim.state==='won'||sim.state==='lost'){if(sim.state==='won')totalScore+=sim.score;showScreen('result');break;}}
    const state=sim.snapshot();lastState=state;world.sync(state,dt);updateHud(state);
  }else if(sim&&mode==='pause'){world.sync(sim.snapshot(),dt);}
  world.render(dt);
}
world.build(1);world.sync(new Simulation({seed:1,night:1}).snapshot());showScreen('menu');requestAnimationFrame(frame);
