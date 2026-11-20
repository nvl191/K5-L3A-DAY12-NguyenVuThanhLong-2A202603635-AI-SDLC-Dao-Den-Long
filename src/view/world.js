import * as THREE from 'three';
import { CONFIG, makeRng, surfaceAt } from '../sim/config.js';

const c=(hex)=>new THREE.Color(hex);
const mat=(color,roughness=.8,emissive='#000000',emissiveIntensity=0)=>new THREE.MeshStandardMaterial({color,roughness,emissive,emissiveIntensity});
const V=(p)=>new THREE.Vector3(p[0],p[1],p[2]);

export class LanternWorld {
  constructor(canvas) {
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.15;
    this.scene=new THREE.Scene(); this.scene.background=c('#0e1430'); this.scene.fog=new THREE.FogExp2('#111936',.009);
    this.camera=new THREE.PerspectiveCamera(52,window.innerWidth/window.innerHeight,.1,220);
    this.camera.position.set(0,7,-10); this.target=new THREE.Vector3(0,1,0);
    this.clock=new THREE.Clock(); this.tickTime=0;
    this.ambient=new THREE.HemisphereLight('#9baee0','#20342f',.32); this.scene.add(this.ambient);
    this.moon=new THREE.DirectionalLight('#93a7e4',1.35); this.moon.position.set(-15,30,-10); this.moon.castShadow=true; this.moon.shadow.mapSize.set(1024,1024); this.moon.shadow.camera.left=-50;this.moon.shadow.camera.right=50;this.moon.shadow.camera.top=50;this.moon.shadow.camera.bottom=-50;this.scene.add(this.moon);
    this.root=new THREE.Group();this.scene.add(this.root);
    this.entityRoot=new THREE.Group();this.root.add(this.entityRoot);
    this.mats={grass:mat('#2f5d50'),grass2:mat('#3c715e'),sand:mat('#c9b48a'),wood:mat('#6b4a2f'),sea:mat('#12384a'),stone:mat('#46536b'),dark:mat('#120a1a',.6),purple:mat('#7a3cff',.35,'#7a3cff',1.2),stunned:mat('#3a3450',.5,'#8b7caa',.4),gold:mat('#ffb347',.25,'#ff9d38',2.8),warm:mat('#ffe9b0',.2,'#ffe9b0',3),mote:mat('#fff6c2',.2,'#ffe58a',4),coat:mat('#e8e2d0'),red:mat('#c8102e'),gray:mat('#8fa3b8'),cloud:new THREE.MeshStandardMaterial({color:'#9ca7c2',transparent:true,opacity:.12,roughness:1}),water:new THREE.MeshStandardMaterial({color:'#12384a',metalness:.1,roughness:.42,transparent:true,opacity:.82})};
    this.cache=new Map();
    this.meshes={};this.groups={};this.lastNight=0;this.colorblind=false;this.reducedMotion=false;
    this.resize=()=>{this.camera.aspect=window.innerWidth/window.innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(window.innerWidth,window.innerHeight);this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));};
    window.addEventListener('resize',this.resize);
  }

  // Entities are spawned in large numbers (benchmark: 200 shades, 100 motes), so geometry and materials are shared.
  _shared(key,factory){let value=this.cache.get(key);if(!value){value=factory();this.cache.set(key,value);}return value;}
  clear() {
    this.root.clear();this.entityRoot=new THREE.Group();this.root.add(this.entityRoot);
    this.meshes={};this.groups={};
  }
  _mesh(geo,material,parent=this.root,position=[0,0,0],scale=null) {
    const m=new THREE.Mesh(geo,material);m.position.set(...position);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  _island(cx,cz,r,y=0) {
    this._mesh(new THREE.CylinderGeometry(r,r*.95,1.8,72,1),this.mats.sea,this.root,[cx,y-.9,cz]);
    this._mesh(new THREE.CylinderGeometry(r*.99,r*.98,.32,72),this.mats.sand,this.root,[cx,y-.1,cz]);
    this._mesh(new THREE.CylinderGeometry(r*.97,r*.97,.14,72),this.mats.grass,this.root,[cx,y+.04,cz]);
    const rim=this._mesh(new THREE.TorusGeometry(r-.25,.12,8,96),this.mats.sand,this.root,[cx,y-.02,cz]);rim.rotation.x=Math.PI/2;
  }
  build(night) {
    this.clear();this.lastNight=night;this.night=night;
    this.scene.background=c(night===3?'#10112b':'#0e1430');this.scene.fog.color=c(night===3?'#1b2350':'#121b3c');
    const spec=CONFIG.nights[night];
    // Cloud sea and a quiet star field.
    const sea=this._mesh(new THREE.CircleGeometry(115,96),this.mats.water,this.root,[0,-3.2,0]);sea.rotation.x=-Math.PI/2;
    const rng=makeRng(7731+night);
    const starPositions=[];
    for(let i=0;i<260;i++){const a=rng()*Math.PI*2,r=20+rng()*90;starPositions.push(Math.cos(a)*r,18+rng()*45,Math.sin(a)*r);}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
    const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:'#dce3ff',size:.11,transparent:true,opacity:.75,sizeAttenuation:true}));this.root.add(stars);
    for(let i=0;i<48;i++){const a=rng()*Math.PI*2,r=42+rng()*22;const cloud=this._mesh(new THREE.SphereGeometry(1,10,7),this.mats.cloud,this.root,[Math.cos(a)*r,-1+rng()*2,Math.sin(a)*r],[2+rng()*4,.5+rng()*1.2,1.4+rng()*2]);cloud.rotation.y=rng()*Math.PI;}
    if(night===1)this._island(0,0,40,0);
    if(night===2){this._island(0,0,28,0);this._island(70,0,28,0);this._mesh(new THREE.BoxGeometry(18,.24,4),this.mats.wood,this.root,[35,.15,0]);for(const x of [27,43]){const post=this._mesh(new THREE.CylinderGeometry(.18,.18,1.3,8),this.mats.wood,this.root,[x,.8,0]);post.castShadow=false;}for(const p of [[20,0,18],[50,0,-18]])this._springPad(p);}
    if(night===3){this._island(0,0,45,0);const ring=this._mesh(new THREE.RingGeometry(12,24,72,1,Math.PI,Math.PI),this.mats.grass2,this.root,[0,3,0]);ring.rotation.x=-Math.PI/2;this._mesh(new THREE.CylinderGeometry(8,8,.35,48),this.mats.grass2,this.root,[0,6,0]);const tower=this._mesh(new THREE.CylinderGeometry(1.4,1.8,8,16),this.mats.wood,this.root,[0,10,0]);this._mesh(new THREE.ConeGeometry(2.4,1.6,12),this.mats.gold,this.root,[0,14.5,0]);tower.castShadow=true;for(const angle of [30,150]){const a=angle*Math.PI/180,ramp=this._mesh(new THREE.BoxGeometry(6,.24,3),this.mats.sand,this.root,[Math.cos(a)*27,1.5,Math.sin(a)*27]);ramp.rotation.y=-a;}this._springPad([0,3,13]);}
    this._decor(night,rng);
    this._createMây();
    for(const l of spec.lanterns)this._createLantern(l);
    this._createEntities();
  }

  _decor(night,rng) {
    const islandDefs=night===2?[[0,0,28],[70,0,28]]:[[0,0,night===3?45:40]];
    for(const [cx,cz,r] of islandDefs) for(let i=0;i<Math.floor(r*2.2);i++){
      const a=rng()*Math.PI*2,d=Math.sqrt(rng())*(r-3),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
      if(night===2&&cx===0&&x>21&&x<48&&Math.abs(z)<4)continue;
      if(night===3&&d>12&&d<24&&z>0)continue;
      if(rng()<.52){const h=1.2+rng()*2.2;const trunk=this._mesh(new THREE.CylinderGeometry(.12,.2,h*.55,6),this.mats.wood,this.root,[x,h*.27,z]);trunk.castShadow=false;for(let j=0;j<2;j++)this._mesh(new THREE.ConeGeometry(.6+j*.2,h*.5,7),this.mats.grass2,this.root,[x,h*.42+j*h*.22,z]);}
      else {const h=.18+rng()*.32;const grass=this._mesh(new THREE.ConeGeometry(.12,h,5),rng()<.5?this.mats.grass2:this.mats.sand,this.root,[x,h/2,z]);grass.rotation.z=(rng()-.5)*.45;grass.castShadow=false;}
    }
    // Distant islands are only scenery; they are not collidable.
    for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2,r=58+i%2*5;const p=[Math.cos(a)*r,-1.8,Math.sin(a)*r];this._mesh(new THREE.CylinderGeometry(3,4,2.5,16),this.mats.sea,this.root,p);}
  }

  _createMây() {
    const g=new THREE.Group();this.root.add(g);this.groups.player=g;
    const body=this._mesh(new THREE.CapsuleGeometry(.38,.72,4,8),this.mats.coat,g,[0,.75,0]);body.castShadow=true;
    const head=this._mesh(new THREE.SphereGeometry(.38,16,12),mat('#f0c6a1'),g,[0,1.45,0]);
    const brim=this._mesh(new THREE.CylinderGeometry(.55,.55,.06,20),this.mats.red,g,[0,1.78,0]);
    const hat=this._mesh(new THREE.ConeGeometry(.44,.52,20),this.mats.sand,g,[0,2.06,0]);hat.rotation.z=.12;
    const scarf=this._mesh(new THREE.BoxGeometry(.76,.13,.18),this.mats.red,g,[-.12,1.23,.04]);scarf.rotation.y=-.2;
    const lampG=new THREE.Group();g.add(lampG);this._mesh(new THREE.CylinderGeometry(.06,.06,.34,8),this.mats.wood,lampG,[.54,.9,.05]);this._mesh(new THREE.OctahedronGeometry(.13),this.mats.gold,lampG,[.54,.72,.05]);
    const glow=new THREE.PointLight('#ffb347',.65,4,2);glow.position.set(.54,.75,.05);lampG.add(glow);
    const shadow=this._mesh(new THREE.CircleGeometry(.48,24),new THREE.MeshBasicMaterial({color:'#080d1c',transparent:true,opacity:.42,depthWrite:false}),g,[0,.025,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
    this.groups.playerLamp=glow;
  }

  _createLantern(data) {
    const g=new THREE.Group();g.position.set(data[0],data[1],data[2]);this.root.add(g);
    this._mesh(new THREE.CylinderGeometry(.45,.6,.25,12),this.mats.wood,g,[0,.12,0]);
    this._mesh(new THREE.CylinderGeometry(.18,.3,1.35,10),this.mats.wood,g,[0,.88,0]);
    this._mesh(new THREE.TorusGeometry(.38,.07,8,16),this.mats.gold,g,[0,1.65,0]);
    this._mesh(new THREE.SphereGeometry(.29,16,12),this.mats.stone,g,[0,1.88,0]);
    const core=this._mesh(new THREE.OctahedronGeometry(.2),this.mats.gold,g,[0,1.9,0]);
    const flame=this._mesh(new THREE.SphereGeometry(.12,10,8),this.mats.warm,g,[0,1.92,0]);
    const light=new THREE.PointLight('#ffb347',.25,5,2);light.position.set(0,2,0);g.add(light);
    const halo=this._mesh(new THREE.TorusGeometry(.55,.025,6,32),mat('#ffb347',.4,'#ffb347',.9),g,[0,.06,0]);halo.rotation.x=Math.PI/2;
    const fuelBar=new THREE.Group();fuelBar.position.set(0,2.55,0);g.add(fuelBar);
    const barBack=this._mesh(new THREE.BoxGeometry(1.12,.09,.09),mat('#171a2b'),fuelBar,[0,0,0]);barBack.castShadow=false;barBack.receiveShadow=false;
    const fuelFill=this._mesh(new THREE.BoxGeometry(1,.065,.095),mat('#ffc857',.35,'#ffb347',.7),fuelBar,[-.06,0,.012]);fuelFill.castShadow=false;fuelFill.receiveShadow=false;fuelBar.visible=false;
    const tearMat=new THREE.LineBasicMaterial({color:'#171a2b',linewidth:2});
    const tearGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.09,1.78,.305),new THREE.Vector3(.01,1.88,.31),new THREE.Vector3(-.04,1.95,.305)]);
    const tear=new THREE.Line(tearGeometry,tearMat);tear.visible=true;g.add(tear);
    const index=this.groups.lanternCount??0;this.groups.lanternCount=index+1;
    g.userData={id:`L${index+1}`,pos:data,core,flame,light,halo,fuelBar,fuelFill,tear};this.groups[`lantern:${g.userData.id}`]=g;
  }

  _createEntities(){
    this.groups.motes=new Map();this.groups.shades=new Map();this.groups.drifters=new Map();this.groups.charms=new Map();this.groups.effects=[];
    this.groups.leaves=new THREE.Group();this.entityRoot.add(this.groups.leaves);const rng=makeRng(991+this.night);
    for(let i=0;i<30;i++){const leaf=this._mesh(new THREE.PlaneGeometry(.2,.085),new THREE.MeshBasicMaterial({color:i%3===0?'#f2c14e':'#c9b48a',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}),this.groups.leaves);leaf.userData={phase:rng()*Math.PI*2,rad:2+rng()*7,offset:rng()*18};leaf.rotation.x=-Math.PI/2;}
  }
  _springPad(pos){const g=new THREE.Group();g.position.set(...pos);this.root.add(g);const stone=this._mesh(new THREE.CylinderGeometry(.72,.9,.22,12),this.mats.stone,g,[0,.11,0]);this._mesh(new THREE.TorusGeometry(.68,.07,8,28),this.mats.gold,g,[0,.25,0]).rotation.x=Math.PI/2;this._mesh(new THREE.OctahedronGeometry(.18),this.mats.warm,g,[0,.47,0]);const light=new THREE.PointLight('#ffb347',.55,4,2);light.position.y=.5;g.add(light);}
  _entityMap(type,id){return this.groups[type].get(id);}
  setColorblind(enabled){this.colorblind=Boolean(enabled);}
  setReducedMotion(enabled){this.reducedMotion=Boolean(enabled);}
  _makeMote(m){
    const g=new THREE.Group();g.position.set(m.pos[0],m.pos[1]+.55,m.pos[2]);
    // No per-mote PointLight: dozens of dynamic lights make every lit fragment expensive. Emissive core + halo keeps the glow.
    const orb=this._mesh(this._shared('mote-orb',()=>new THREE.SphereGeometry(.12,10,8)),this.mats.mote,g);orb.castShadow=false;orb.receiveShadow=false;
    const halo=this._mesh(this._shared('mote-halo-geo',()=>new THREE.SphereGeometry(.28,12,8)),this._shared('mote-halo-mat',()=>new THREE.MeshBasicMaterial({color:'#ffe58a',transparent:true,opacity:.2,depthWrite:false})),g);halo.castShadow=false;halo.receiveShadow=false;
    const phase=String(m.id).split('').reduce((a,ch)=>a+ch.charCodeAt(0),0)%628/100;g.userData={baseY:g.position.y,phase,id:m.id};this.entityRoot.add(g);return g;
  }
  _shadeMaterials(){
    return this._shared('shade-mats',()=>({aura:new THREE.MeshBasicMaterial({color:'#7a3cff',transparent:true,opacity:.12,depthWrite:false}),eye:mat('#d8bdff',.1,'#a56eff',1.4)}));
  }
  _makeShade(s){
    const m=this._shadeMaterials(),geo=(key,factory)=>this._shared(key,factory);
    const g=new THREE.Group();const body=this._mesh(geo('shade-body',()=>new THREE.SphereGeometry(.48,14,12)),this.mats.dark,g,[0,0,0],[1,1.35,.8]);body.castShadow=false;
    const aura=this._mesh(geo('shade-aura',()=>new THREE.SphereGeometry(.78,14,10)),m.aura,g,[0,0,0]);aura.castShadow=false;aura.receiveShadow=false;
    for(const x of [-.17,.17]){const eye=this._mesh(geo('shade-eye',()=>new THREE.SphereGeometry(.055,8,6)),m.eye,g,[x,.12,.38]);eye.castShadow=false;}
    for(let i=0;i<3;i++){const tail=this._mesh(geo('shade-tail',()=>new THREE.ConeGeometry(.16,.42,6)),this.mats.dark,g,[(i-1)*.25,-.48,-.05]);tail.rotation.x=Math.PI;tail.castShadow=false;}
    g.userData={id:s.id};this.entityRoot.add(g);return g;
  }
  _makeDrifter(d){
    const g=new THREE.Group();this._mesh(new THREE.SphereGeometry(.28,12,10),this.mats.gray,g,[0,0,0],[.75,.7,1.3]);
    const sash=this._mesh(new THREE.TorusGeometry(.32,.045,6,16),mat('#a9bacb',.45,'#6f96b4',.3),g,[0,0,0]);sash.rotation.x=.8;
    this._mesh(new THREE.SphereGeometry(.045,8,6),this.mats.warm,g,[0,.04,.25]);g.userData={id:d.id,phase:0};this.entityRoot.add(g);return g;
  }
  _makeCharm(ch){
    const g=new THREE.Group();this._mesh(new THREE.OctahedronGeometry(.23),this.mats.red,g);this._mesh(new THREE.TorusGeometry(.31,.035,6,24),this.mats.gold,g);g.userData={id:ch.id,phase:0};this.entityRoot.add(g);return g;
  }

  _syncGroup(map,items,make,visible=()=>true){
    const keep=new Set();
    for(const item of items){keep.add(item.id);let g=map.get(item.id);if(!g){g=make(item);map.set(item.id,g);}g.visible=visible(item);if(g.visible){g.position.set(item.pos[0],item.pos[1]+(map===this.groups.motes ? 0.55 : 0),item.pos[2]);}}
    for(const [id,g] of map){if(!keep.has(id)){this.entityRoot.remove(g);map.delete(id);}}
  }

  sync(state,dt=1/60){
    if(!state)return;
    if(this.lastNight!==state.night)this.build(state.night);
    const player=this.groups.player;
    player.position.lerp(V(state.player.pos),this.reducedMotion?1:1-Math.exp(-dt*15));
    const f=state.player.vel; if(Math.hypot(f[0],f[2])>.1)player.rotation.y=Math.atan2(f[0],f[2]);
    this.target.set(state.player.pos[0],state.player.pos[1]+1,state.player.pos[2]);
    const yaw=window.__lanternYaw??0;
    const desired=new THREE.Vector3(state.player.pos[0]-Math.sin(yaw)*8,state.player.pos[1]+5.1,state.player.pos[2]-Math.cos(yaw)*8);
    this.camera.position.lerp(desired,this.reducedMotion?1:1-Math.exp(-dt*4.2));this.camera.lookAt(this.target);
    const ratio=state.lanterns.reduce((sum,l)=>sum+(l.fuel??0)/100,0)/state.lanterns.length;
    this.ambient.intensity=.15+.55*ratio;this.scene.fog.density=state.night===3?.011:.009;
    for(const l of state.lanterns){
      const g=this.groups[`lantern:${l.id}`];if(!g)continue;
      const u=g.userData,low=l.lit&&l.fuel<30,blink=this.reducedMotion||!low||state.sim_tick%60<30,shown=l.lit&&blink;
      g.scale.y=l.lit?1:.8;u.core.material=l.lit?this.mats.warm:this.mats.stone;u.core.visible=shown;u.flame.visible=shown;
      u.light.intensity=shown?2.8:.08;u.light.distance=shown?13:4;u.halo.material.color.set(l.lit?'#ffb347':'#788196');u.halo.material.emissive?.set(l.lit?'#ffb347':'#788196');u.halo.material.emissiveIntensity=shown?1.6:.08;u.halo.scale.setScalar(l.lit?1.5:1);
      u.fuelBar.visible=shown;u.fuelFill.scale.x=Math.max(.001,(l.fuel??0)/100);u.fuelFill.position.x=-(1-u.fuelFill.scale.x)*.5;u.tear.visible=!l.lit;
    }
    this._syncGroup(this.groups.motes,state.motes,(m)=>this._makeMote(m));
    this._syncGroup(this.groups.shades,state.shades,(s)=>this._makeShade(s));
    this._syncGroup(this.groups.drifters,state.drifters,(d)=>this._makeDrifter(d));
    this._syncGroup(this.groups.charms,state.charms,(ch)=>this._makeCharm(ch),(ch)=>ch.available);
    const shadeMats=this._shadeMaterials();shadeMats.aura.color.set(this.colorblind?'#00b3ff':'#7a3cff');shadeMats.eye.color.set(this.colorblind?'#b8f0ff':'#d8bdff');shadeMats.eye.emissive.set(this.colorblind?'#00b3ff':'#a56eff');
    for(const s of state.shades){const g=this.groups.shades.get(s.id);if(!g)continue;g.position.set(s.pos[0],s.pos[1],s.pos[2]);g.children[0].material=s.state==='stunned'?this.mats.stunned:this.mats.dark;g.rotation.y=Math.sin(state.sim_tick*.025)*.25;}
    for(const d of state.drifters){const g=this.groups.drifters.get(d.id);if(g){g.position.set(d.pos[0],d.pos[1]+.6,d.pos[2]);g.rotation.z=Math.sin(state.sim_tick*.05)*.12;}}
    for(const ch of state.charms){const g=this.groups.charms.get(ch.id);if(g){g.visible=ch.available;g.position.set(ch.pos[0],ch.pos[1]+.7+Math.sin(state.sim_tick*.06)*.12,ch.pos[2]);g.rotation.y+=dt*.8;}}
    for(const [id,g] of this.groups.motes){g.position.y=g.userData.baseY+Math.sin(state.sim_tick*.07+g.userData.phase)*.12;g.rotation.y+=dt*.8;}
    if(this.groups.leaves){const cycle=state.sim_tick%1800,visible=!this.reducedMotion&&state.night===3&&state.sim_tick>0&&(state.wind.active||cycle<120);this.groups.leaves.visible=visible;if(visible){const dir=(state.wind.dir_deg??0)*Math.PI/180;for(const leaf of this.groups.leaves.children){const ph=leaf.userData.phase+state.sim_tick*.045,drift=state.wind.active?(state.sim_tick%300)/300*3:0;leaf.position.set(state.player.pos[0]+Math.cos(ph)*leaf.userData.rad+Math.cos(dir)*drift,state.player.pos[1]+.15+Math.abs(Math.sin(ph*1.7))*.9,state.player.pos[2]+Math.sin(ph)*leaf.userData.rad+Math.sin(dir)*drift);leaf.rotation.z=ph*.8;}}}
    this.tickTime+=dt;
  }

  syncBenchmark(state,dt,elapsed){
    this.sync(state,dt);
    const angle=(elapsed/15)*Math.PI*2;
    this.camera.position.set(Math.cos(angle)*30,15,Math.sin(angle)*30);
    this.target.set(0,0,0);this.camera.lookAt(this.target);
  }

  render(dt){this.renderer.render(this.scene,this.camera);}
  dispose(){window.removeEventListener('resize',this.resize);this.renderer.dispose();}
}
