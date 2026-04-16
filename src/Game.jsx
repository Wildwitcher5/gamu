import { useState, useRef, useEffect } from "react";
import "./index.css";
import Tutorial from "./Tutorial.jsx";
import Survey, { getCurrentSession, saveCurrentSession, upsertResponse, getGroupText } from "./Survey.jsx";
import AVATAR_MANIFEST from "virtual:avatar-manifest";
import { selectPersona, pickNickname } from "./personas/index.js";

/* ── Embedded assets (frame PNG + crystal PNG — small, needed for card UI) ── */
const FR = "/assets/card_frame.png";
const CR = "/assets/card_cr.png";

/* ── External assets — place your images in public/assets/ ──────────────── */
/*    Filenames the game expects:                                              */
/*    public/assets/bg.jpg          — board background                        */
/*    public/assets/combo.jpg       — combo flash image                       */
/*    public/assets/cards/attack.jpg                                           */
/*    public/assets/cards/rage.jpg                                             */
/*    public/assets/cards/shield.jpg                                           */
/*    public/assets/cards/joint.jpg                                            */
/*    public/assets/cards/trap.jpg                                             */
/*    public/assets/cards/double.jpg                                           */
/*    public/assets/cards/spy.jpg                                              */
/*    public/assets/cards/counter.jpg                                          */
/*    public/assets/cards/healAlex.jpg                                         */
/*    public/assets/cards/energy.jpg                                           */
/*    public/assets/cards/revive.jpg                                           */
/*    public/assets/cards/poison.jpg                                           */
const BG        = "/assets/bg.jpeg";
const COMBO_ART = "/assets/Combo.jpeg";
const COMBO_ARTS = {
  "Ядовитый огонь 🔥☠️": "/assets/piosonrage.jpeg",
  "Двойной удар ⚔️⚔️":   "/assets/cards/attack.jpeg",
  "Натиск ⚔️⚔️⚔️":        "/assets/onslaught.jpeg",
  "Крепость 🛡️💉":        "/assets/fortress.jpeg",
  "Засада 🪤⚔️":           "/assets/ambush.jpeg",
  "Шквал ⚡🔥":            "/assets/cards/rage.jpeg",
  "Кровавый яд ☠️🩸":     "/assets/cards/poison.jpeg",
  "💥 СОВМЕСТНЫЙ УДАР":   "/assets/doublecombo.jpeg",
};
const getComboArt = n => COMBO_ARTS[n] ?? COMBO_ART;
const JOINT_IMG = "/assets/doublecombo.jpeg";
const CARD_BACK = "/assets/backcard.png";
const FATIGUE_ICON = "/assets/fatigue.png";
const ART = {
  attack:   "/assets/cards/attack.jpeg",
  rage:     "/assets/cards/rage.jpeg",
  shield:   "/assets/cards/shield.jpeg",
  joint:    "/assets/Combo.jpeg",
  trap:     "/assets/cards/trap.jpeg",
  double:   "/assets/cards/double.jpeg",
  spy:      "/assets/cards/spy.jpeg",
  counter:  "/assets/cards/counter.jpeg",
  healAlex: "/assets/cards/heal.jpeg",
  energy:   "/assets/cards/energy.jpeg",
  revive:   "/assets/cards/revive.jpeg",
  poison:   "/assets/cards/poison.jpeg",
  bleed:    "/assets/cards/bleeding.jpeg",
  perebor:  "/assets/cards/energy.jpeg",
  jcounter: "/assets/cards/counter.jpeg",
};

/* ── Constants ──────────────────────────────────────────────────────────── */
const SKIP = "[SKIP]";
const MHP = { you:100, alex:100, e1:100, e2:100 };

/* Russian pluralization: plRu(3,"ход","хода","ходов") → "3 хода" */
function plRu(n, one, few, many){
  const a=Math.abs(n)%100, m=a%10;
  if(a>=11&&a<=19) return `${n} ${many}`;
  if(m===1)        return `${n} ${one}`;
  if(m>=2&&m<=4)   return `${n} ${few}`;
  return `${n} ${many}`;
}

const CARDS = {
  attack:  {e:"⚔️",  n:"АТАКА",        d:"−8 здоровья врагу",                              c:"#e05252", t:"enemy", od:1},
  double:  {e:"⚔️⚔️",n:"РАССЕЧЕНИЕ",   d:"−8 здоровья двум разным врагам",                 c:"#ff7070", t:"enemy", od:2},
  shield:  {e:"🛡️", n:"ЩИТ",          d:"+10 здоровья себе",                               c:"#4c7fe0", t:null,    od:1},
  healAlex:{e:"💉",  n:"ИСЦЕЛИТЬ",     d:"+12 здоровья Союзнику",                           c:"#4caf82", t:null,    od:1},
  poison:  {e:"☠️",  n:"ЯД",           d:"−5 здоровья в ход · 3 хода подряд = 15 урона",          c:"#7bc67e", t:"enemy", od:1},
  bleed:   {e:"🩸",  n:"КРОВОТЕЧЕНИЕ", d:"−3 здоровья в ход · 4 хода (каждое применение +4 хода)", c:"#cc3344", t:"enemy", od:1},
  rage:    {e:"🔥",  n:"ЯРОСТЬ",       d:"−18 здоровья врагу, −4 себе",                    c:"#e06030", t:"enemy", od:2},
  joint:   {e:"💥",  n:"СОВМ. УДАР",  d:"22 урона (нужно согласие Союзника)",              c:"#e09a3c", t:"enemy", od:1},
  spy:     {e:"🔍",  n:"ШПИОНАЖ",     d:"Взять случайную карту из руки врага",             c:"#8b5cf6", t:"enemy", od:1},
  energy:  {e:"⚡",  n:"ЭНЕРГИЯ",     d:"+2 ОД на след. ход",                              c:"#f0d060", t:null,    od:1},
  trap:    {e:"🪤",  n:"ЛОВУШКА",     d:"−10 здоровья следующему атакующему врагу",        c:"#d97706", t:null,    od:1},
  counter:  {e:"↩️",  n:"КОНТР",       d:"Отразить входящий урон обратно врагу",            c:"#06b6d4", t:null,    od:1},
  revive:   {e:"✨",  n:"ВОЗРОЖДЕНИЕ", d:"Воскресить Союзника (30 здоровья). Только если мёртв", c:"#ffd700", t:null, od:2},
  perebor:  {e:"🃏",  n:"ПЕРЕБОР",     d:"+2 карты в руку",                                 c:"#9b59b6", t:null,    od:1},
  jcounter: {e:"🔰",  n:"КОНТРУДАР",   d:"Отменить совм. удар врагов, вернуть 50% урона",   c:"#22d3ee", t:"enemy", od:2},
};

const DECK_TEMPLATE = [
  "attack","attack","attack","attack","attack","attack",
  "double","double","double",
  "rage","rage",
  "shield","shield","shield","shield","shield",
  "counter","counter",
  "trap","trap",
  "healAlex","healAlex","healAlex",
  "revive","revive",
  "poison","poison","poison",
  "bleed","bleed","bleed",
  "spy","spy",
  "energy","energy","energy",
  "perebor","perebor",
  "jcounter","jcounter",
  "joint","joint",
];
const RESHUFFLE_TEMPLATE = [
  "attack","attack","shield","shield",
  "poison","bleed","rage","double",
  "energy","joint","trap","counter",
  "perebor","revive","jcounter",
];
const fpCycle=c=>c===1?0:c===2?3:c===3?6:10;
const ALEX_ACTION_MAP={attack:["attack","double","rage","bleed"],shield:["shield","counter","trap"],heal:["healAlex","revive","energy"]};
/* ── Experimental conditions & avatar system ─────────────────────────── */
/*
 * AVATAR_MANIFEST is a virtual module generated at build time by vite.config.js.
 * It scans public/avatars/{pro,against,neutral}/ and lists every image file found,
 * regardless of format (.jpg .jpeg .jfif .png .webp .svg …).
 * Just drop new images into those folders — no code changes needed.
 */
const CONDITIONS = ["cond_1","cond_2","cond_3"];
function assignCondition() { return CONDITIONS[Math.floor(Math.random()*3)]; }

function pickAvatar(folder, exclude=[]) {
  const files = (AVATAR_MANIFEST[folder]?.length
    ? AVATAR_MANIFEST[folder]
    : (AVATAR_MANIFEST.neutral ?? [])
  ).filter(f => !exclude.includes(`/avatars/${folder}/${f}`));
  if (!files.length) return null;
  return `/avatars/${folder}/${files[Math.floor(Math.random()*files.length)]}`;
}
function assignAvatars(condition, ingroup) {
  // outFolder = political opposite of the participant's group
  const outFolder = ingroup === "approve" ? "against" : "pro";
  const inFolder  = ingroup === "approve" ? "pro"     : "against";
  const partnerFolder = outFolder;
  const oppFolder =
    condition === "cond_1" ? inFolder  :
    condition === "cond_2" ? outFolder :
    "neutral"; // cond_3
  const partner    = pickAvatar(partnerFolder);
  const opponent1  = pickAvatar(oppFolder, [partner].filter(Boolean));
  const opponent2  = pickAvatar(oppFolder, [partner, opponent1].filter(Boolean));
  return {
    avatar_partner:    partner,
    avatar_opponent_1: opponent1,
    avatar_opponent_2: opponent2,
  };
}

const shuffle=arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const drawFromDeck=(n,deck,cycle)=>{let d=[...deck],c=cycle;const cards=[];for(let i=0;i<n;i++){if(d.length===0){d=shuffle([...(c>1?RESHUFFLE_TEMPLATE:DECK_TEMPLATE)]);c++;}cards.push({uid:nuid(),type:d.shift(),flipIn:true});}return{cards,deck:d,cycle:c};};
const drawRaw=(n,deck,cycle)=>{let d=[...deck],c=cycle;const types=[];for(let i=0;i<n;i++){if(d.length===0){d=shuffle([...(c>1?RESHUFFLE_TEMPLATE:DECK_TEMPLATE)]);c++;}types.push(d.shift());}return{types,deck:d,cycle:c};};
function createGameInit(){
  _uid=0;
  const d=shuffle([...DECK_TEMPLATE]);
  const{cards:h,deck:d2,cycle:c2}=drawFromDeck(4,d,1);
  const{types:e1h,deck:d3,cycle:c3}=drawRaw(3,d2,c2);
  const{types:e2h,deck:d4,cycle:c4}=drawRaw(3,d3,c3);
  const{types:alh,deck:d5,cycle:c5}=drawRaw(3,d4,c4);
  return{hand:h.map(c=>({...c,flipIn:false})),deck:d5,fatigueCycle:c5,e1Hand:e1h,e2Hand:e2h,alexHand:alh};
}

const COMBOS = [
  {needs:["rage","poison"],    name:"Ядовитый огонь 🔥☠️",  bonus:(_,t)=>({tgt:t,hp:24,poison:4}), msg:"КОМБО: Ядовитый огонь!"},
  {needs:["attack","attack"],  name:"Двойной удар ⚔️⚔️",    bonus:(_,t)=>({tgt:t,hp:8}),           msg:"КОМБО: Двойной удар!"},
  {needs:["attack","double"],  name:"Натиск ⚔️⚔️⚔️",        bonus:(_,t)=>({tgt:t,hp:12}),          msg:"КОМБО: Натиск!"},
  {needs:["shield","healAlex"],name:"Крепость 🛡️💉",        bonus:()=>({self:true,hp:8}),           msg:"КОМБО: Крепость!"},
  {needs:["trap","attack"],    name:"Засада 🪤⚔️",           bonus:(_,t)=>({tgt:t,hp:14}),          msg:"КОМБО: Засада!"},
  {needs:["energy","rage"],    name:"Шквал ⚡🔥",            bonus:(_,t)=>({tgt:t,hp:16}),          msg:"КОМБО: Шквал!"},
  {needs:["poison","bleed"],   name:"Кровавый яд ☠️🩸",     bonus:(_,t)=>({tgt:t,hp:8,poison:2}),  msg:"КОМБО: Кровавый яд!"},
];

let _uid=0;
const nuid=()=>String(++_uid);
const rnd=n=>Math.floor(Math.random()*n);
const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
// en() is now defined inside App() using e1Nick/e2Nick state

// Subset matching: played cards must contain all needed types (may have extras)
function detectCombo(played){
  const types=played.map(p=>p.card.type);
  for(const c of COMBOS){
    const avail=[...types];let match=true;
    for(const n of c.needs){const i=avail.indexOf(n);if(i===-1){match=false;break;}avail.splice(i,1);}
    if(match)return c;
  }
  return null;
}
const initGs=()=>({
  you: {hp:MHP.you, maxHp:MHP.you, poison:0,bleed:0,trap:false,counter:false,jcounter:null},
  alex:{hp:MHP.alex,maxHp:MHP.alex,poison:0,bleed:0},
  e1:  {hp:MHP.e1,  maxHp:MHP.e1,  poison:0,bleed:0},
  e2:  {hp:MHP.e2,  maxHp:MHP.e2,  poison:0,bleed:0},
});

/* ── Small components ─────────────────────────────────────────────────────── */
function HpBar({hp,maxHp,color,flash}){
  const pct=Math.max(0,hp/maxHp*100);
  const low=hp<maxHp*0.3&&hp>0;
  return(
    <div style={{flex:1,position:"relative"}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3,fontFamily:"Georgia,serif"}}>
        <span style={{color:low?"#e05252":"#9a8060"}}>{low?"⚠ ":""}ЗДР</span>
        <span style={{color:low?"#e05252":"#c8b080",fontWeight:700}}>{Math.max(0,hp)}/{maxHp}</span>
      </div>
      <div style={{height:6,background:"rgba(0,0,0,0.4)",borderRadius:3,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3,
          transition:"width 0.5s",boxShadow:low?`0 0 8px ${color}88`:"none"}}/>
      </div>
      {flash&&<div style={{position:"absolute",right:0,top:-20,color:"#ff5555",fontWeight:900,
        fontSize:14,animation:"dmgFloat 0.75s forwards",fontFamily:"Georgia,serif",pointerEvents:"none",zIndex:20}}>
        −{flash}</div>}
    </div>
  );
}

/* ── GameCard — frame-based layout matching the template image ───────────── */
// Frame layout (% of 400x600 base image):
//   Title bar: y 7%-14%, x 20%-80%
//   Art window: y 14%-55%, x 20%-80%
//   Parchment:  y 63%-87%, x 20%-80%
//   Target area: below card

function GameCard({card,selected,dimmed,notEnoughOd,jointPending,comboWith,onPreview,small=false}){
  const def=CARDS[card.type];
  const isJP=jointPending;
  const [tipVisible,setTipVisible]=useState(false);
  const tipTimer=useRef(null);
  const cardCombos=COMBOS.filter(c=>c.needs.includes(card.type));
  const handleMouseEnter=()=>{tipTimer.current=setTimeout(()=>setTipVisible(true),400);};
  const handleMouseLeave=()=>{clearTimeout(tipTimer.current);setTipVisible(false);};
  const W=small?100:148;
  const H=W*1.5;
  // Measured pixel-exact from frame PNG (400x600 source)
  const artL=W*0.225, artT=H*0.14,  artW=W*0.575, artH=H*0.41;
  const titleL=W*0.11, titleT=H*0.087, titleW=W*0.772, titleH=H*0.055;
  // Parchment box: exact match to frame texture
  const pL=W*0.19,  pT=H*0.633, pW=W*0.615, pH=H*0.183;

  const glow=isJP?"#e09a3c":selected?def.c:null;

  return(
    <div style={{width:W,height:H,flexShrink:0,position:"relative",
      animation:card.flipIn?"cardFrontIn 0.8s cubic-bezier(.4,0,.2,1) forwards":"cardPlay 0.8s both"}}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {tipVisible&&!small&&cardCombos.length>0&&(
        <div style={{position:"absolute",bottom:"105%",left:"50%",transform:"translateX(-50%)",
          zIndex:100,background:"rgba(10,8,5,0.95)",border:"1px solid rgba(224,154,60,0.4)",
          borderRadius:6,padding:"6px 10px",fontSize:9,color:"#c8a060",fontFamily:"Georgia,serif",
          whiteSpace:"nowrap",pointerEvents:"none",animation:"fadeIn 0.15s"}}>
          {cardCombos.map(c=>(
            <div key={c.name}>{c.needs.map(t=>CARDS[t]?.e||t).join("+")} = {c.name}</div>
          ))}
        </div>
      )}

      {/* Card back — shown first during flip */}
      {card.flipIn&&(
        <div style={{position:"absolute",inset:0,zIndex:20,borderRadius:8,overflow:"hidden",
          animation:"cardBackOut 0.8s cubic-bezier(.4,0,.2,1) forwards",pointerEvents:"none"}}>
          <img src={CARD_BACK} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
      )}

      {/* Card front — selection/hover transforms live here */}
      <div onClick={()=>{if(!dimmed||selected||isJP)onPreview(card);}}
        style={{position:"absolute",inset:0,cursor:dimmed&&!selected&&!isJP?"default":"pointer",
          opacity:dimmed&&!selected&&!isJP?0.22:1,
          transform:selected?"translateY(-14px) scale(1.07)":isJP?"translateY(-7px) scale(1.02)":"none",
          transition:"all 0.18s cubic-bezier(.4,0,.2,1)",
          filter:glow?`drop-shadow(0 0 12px ${glow}aa)`:"none"}}>

        {comboWith&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",
          fontSize:8,background:"#e09a3c",color:"#000",borderRadius:3,padding:"2px 6px",
          fontFamily:"Georgia,serif",fontWeight:700,whiteSpace:"nowrap",zIndex:10}}>КОМБО</div>}

        {/* Art image — behind frame, clipped to art window area */}
        <div style={{position:"absolute",left:artL,top:artT,width:artW,height:artH,overflow:"hidden",zIndex:1}}>
          {ART[card.type]
            ?<img src={ART[card.type]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:small?22:30,background:"rgba(10,8,5,0.9)"}}>{def.e}</div>}
        </div>

        {/* Title */}
        <div style={{position:"absolute",left:titleL,top:titleT,width:titleW,height:titleH,zIndex:3,
          display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
          <span style={{fontSize:small?7:9,fontWeight:700,color:"#e8d090",fontFamily:"Georgia,serif",
            letterSpacing:0.5,textShadow:"0 1px 3px rgba(0,0,0,0.9)",whiteSpace:"nowrap",
            maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis"}}>
            {def.n.toUpperCase()}
          </span>
        </div>

        {/* Parchment text — pinned to exact parchment area */}
        <div style={{position:"absolute",left:pL,top:pT,width:pW,height:pH,zIndex:3,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:"2px 4px",textAlign:"center",overflow:"hidden"}}>
          <div style={{fontSize:small?7:9,color:"#5a3a18",fontFamily:"Georgia,serif",lineHeight:1.35,
            wordBreak:"break-word"}}>{def.d}</div>
          {isJP&&<div style={{fontSize:7,color:"#e09a3c",marginTop:2,animation:"pulse 1s infinite",fontFamily:"Georgia,serif"}}>⏳</div>}
        </div>

        {/* Frame overlay — on top of everything */}
        <img src={FR} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",
          objectFit:"fill",zIndex:2,pointerEvents:"none"}}/>

        {/* OD cost pips — bottom overlay */}
        <div style={{position:"absolute",bottom:small?3:5,left:0,right:0,
          display:"flex",justifyContent:"center",alignItems:"center",gap:2,zIndex:4}}>
          <OdPips cost={def.od} canAfford={!notEnoughOd} small={small}/>
        </div>
      </div>
    </div>
  );
}

/* ── Crystal pip ─────────────────────────────────────────────────────────── */
function Crystal({active,size=44}){
  return(
    <div style={{width:size,height:size,opacity:active?1:0.2,transition:"opacity 0.3s",
      filter:active?"drop-shadow(0 0 10px rgba(60,160,255,0.9))":"none"}}>
      <img src={CR} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
    </div>
  );
}

/* ── OD cost pips on cards ─────────────────────────────────────────────────── */
function OdPips({cost,canAfford,small=false}){
  const sz=small?14:20;
  return(
    <div style={{display:"flex",gap:3,alignItems:"center",justifyContent:"center"}}>
      {Array.from({length:cost},(_,i)=>(
        <div key={i} style={{width:sz,height:sz,opacity:canAfford?1:0.3,
          filter:canAfford?"drop-shadow(0 0 6px rgba(60,160,255,0.95))":"grayscale(1) brightness(0.5)",
          transition:"all 0.2s"}}>
          <img src={CR} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
        </div>
      ))}
    </div>
  );
}

/* ── Visual deck stack ─────────────────────────────────────────────────────── */
function DeckStack({count,fatigueCycle}){
  const fpCard=fpCycle(fatigueCycle);
  const layers=count>=12?5:count>=7?3:count>=3?2:count>=1?1:0;
  const W=54,H=76;
  const tip=`Осталось ${plRu(count,"карта","карты","карт")}. Цикл: ${fatigueCycle}. Изнурение: ${fpCard} здоровья за карту`;
  if(count===0)return(
    <div title={tip} style={{width:W,height:H+22,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:4,flexShrink:0}}>
      <div style={{width:W,height:H,border:"2px dashed rgba(200,160,80,0.15)",borderRadius:8,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:9,color:"#2a1808",fontFamily:"Georgia,serif"}}>—</span>
      </div>
      <div style={{fontSize:10,color:"#3a2808",fontFamily:"Georgia,serif"}}>{plRu(0,"карта","карты","карт")}</div>
    </div>
  );
  const offset=(layers-1)*3;
  return(
    <div title={tip} style={{position:"relative",width:W+offset,height:H+offset+22,
      flexShrink:0,cursor:"help"}}>
      {Array.from({length:layers},(_,i)=>(
        <div key={i} style={{position:"absolute",
          left:(layers-1-i)*3,top:(layers-1-i)*3,
          width:W,height:H,zIndex:i+1,
          borderRadius:8,overflow:"hidden",
          boxShadow:`0 ${1+i}px ${4+i*2}px rgba(0,0,0,0.65)`}}>
          <img src={CARD_BACK} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
      ))}
      <div style={{position:"absolute",bottom:0,left:0,right:0,
        textAlign:"center",fontSize:10,color:"#8a7050",fontFamily:"Georgia,serif"}}>
        {plRu(count,"карта","карты","карт")}
      </div>
    </div>
  );
}

/* ── Card backs row (enemy/ally hand display) ─────────────────────────────── */
function CardBackRow({count}){
  if(!count||count<=0)return null;
  const W=36,H=50;
  const show=Math.min(count,7);
  return(
    <div style={{display:"flex",gap:2,justifyContent:"center",flexWrap:"wrap",marginTop:7}}>
      {Array.from({length:show},(_,i)=>(
        <div key={`${count}-${i}`} style={{width:W,height:H,borderRadius:4,overflow:"hidden",
          boxShadow:"0 2px 4px rgba(0,0,0,0.5)",flexShrink:0,
          animation:i===show-1?"cardPlay 0.4s both":undefined}}>
          <img src={CARD_BACK} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
      ))}
      {count>7&&<span style={{fontSize:9,color:"#6a5030",fontFamily:"Georgia,serif",
        alignSelf:"center"}}>+{count-7}</span>}
    </div>
  );
}

/* ── Card preview overlay ─────────────────────────────────────────────────── */
function CardPreview({card,gs,onApply,onTarget,onClose,isP,odLeft,alreadySel,en}){
  if(!card)return null;
  const def=CARDS[card.type];
  const W=200, H=W*1.5;
  // Measured pixel-exact from frame PNG (400x600 source)
  const artL=W*0.225, artT=H*0.14,  artW=W*0.575, artH=H*0.41;
  const titleL=W*0.11, titleT=H*0.087, titleW=W*0.772, titleH=H*0.055;
  // Parchment box: exact match to frame texture
  const pL=W*0.19,  pT=H*0.633, pW=W*0.615, pH=H*0.183;
  const notOd=odLeft<def.od&&!alreadySel;
  const needsTgt=def.t==="enemy"||card.type==="joint";
  const canAct=!notOd&&isP;

  return(
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",
      justifyContent:"center",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",
      animation:"fadeIn 0.15s"}} onClick={onClose}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}
        onClick={e=>e.stopPropagation()}>
        
        {/* Big card */}
        <div style={{position:"relative",width:W,height:H,
          filter:`drop-shadow(0 0 30px ${def.c}77)`,animation:"scaleIn 0.2s"}}>
          <div style={{position:"absolute",left:artL,top:artT,width:artW,height:artH,overflow:"hidden",zIndex:1}}>
            {ART[card.type]
              ?<img src={ART[card.type]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:48,background:"rgba(10,8,5,0.9)"}}>{def.e}</div>}
          </div>
          <div style={{position:"absolute",left:titleL,top:titleT,width:titleW,height:titleH,zIndex:3,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:"#e8d090",fontFamily:"Georgia,serif",
              letterSpacing:1,textShadow:"0 1px 3px rgba(0,0,0,0.9)"}}>
              {def.n.toUpperCase()}</span>
          </div>
          <div style={{position:"absolute",left:pL,top:pT,width:pW,height:pH,zIndex:3,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            padding:"4px 8px",textAlign:"center"}}>
            <div style={{fontSize:11,color:"#5a3a18",fontFamily:"Georgia,serif",lineHeight:1.5}}>{def.d}</div>
          </div>
          <img src={FR} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"fill",zIndex:2,pointerEvents:"none"}}/>
        </div>

        {/* Action buttons BELOW the card */}
        <div style={{display:"flex",flexDirection:"column",gap:8,width:200}}>
          <div style={{textAlign:"center",fontFamily:"Georgia,serif",fontSize:12,color:"#3cb0ff"}}>
            {"●".repeat(def.od)} {def.od===1?"1 очко действия":"2 очка действия"}
          </div>
          {notOd&&<div style={{fontSize:11,color:"#e05252",textAlign:"center",fontFamily:"Georgia,serif"}}>Недостаточно очков действия</div>}
          {alreadySel&&<div style={{fontSize:11,color:"#4caf82",textAlign:"center",fontFamily:"Georgia,serif"}}>✓ Карта выбрана</div>}

          {card.type==="healAlex"&&gs.alex.hp<=0&&(
            <div style={{fontSize:11,color:"#e05252",textAlign:"center",fontFamily:"Georgia,serif"}}>
              Союзник мёртв — сначала используй Возрождение
            </div>
          )}
          {canAct&&!alreadySel&&!needsTgt&&!(card.type==="healAlex"&&gs.alex.hp<=0)&&(
            <button onClick={onApply} style={{background:"linear-gradient(135deg,#7a4008,#c87820)",color:"#fff",
              border:"none",borderRadius:7,padding:"10px",fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:0.5}}>
              Применить</button>
          )}
          {canAct&&!alreadySel&&needsTgt&&(
            <>
              {gs.e1.hp>0&&<button onClick={()=>onTarget("e1")} style={{background:"#6a1818",color:"#fff",
                border:`1px solid ${def.c}88`,borderRadius:7,padding:"14px 18px",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:"Georgia,serif",minHeight:48}}>
                ⚔ Удар по {en("e1")} ({gs.e1.hp} здоровья)</button>}
              {gs.e2.hp>0&&<button onClick={()=>onTarget("e2")} style={{background:"#4a1050",color:"#fff",
                border:`1px solid ${def.c}88`,borderRadius:7,padding:"14px 18px",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:"Georgia,serif",minHeight:48}}>
                ⚔ Удар по {en("e2")} ({gs.e2.hp} здоровья)</button>}
            </>
          )}
          {alreadySel&&(
            <button onClick={onApply} style={{background:"rgba(180,40,40,0.3)",color:"#e05252",
              border:"1px solid #e05252",borderRadius:7,padding:"10px",fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Отменить выбор</button>
          )}
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",color:"#9a8060",
            border:"1px solid rgba(255,255,255,0.12)",borderRadius:7,padding:"8px",fontSize:11,
            cursor:"pointer",fontFamily:"Georgia,serif"}}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

/* Enemy card animation overlay — shows one enemy at a time */
function EnemyCardShow({enemyCard,e1Nick,e2Nick}){
  const {e1,e2}=enemyCard;
  const actor=e1?"e1":e2?"e2":null;
  const type=actor?enemyCard[actor]:null;
  if(!actor||!type)return null;
  const def=CARDS[type]||{e:"⚔️",n:type,c:"#e05252",d:""};
  const isE1=actor==="e1";
  const color=isE1?"#e05252":"#a03070";
  const W=155,H=W*1.5;
  const artL=W*0.225,artT=H*0.14,artW=W*0.575,artH=H*0.41;
  const titleL=W*0.11,titleT=H*0.087,titleW=W*0.772,titleH=H*0.055;
  const pL=W*0.19,pT=H*0.633,pW=W*0.615,pH=H*0.183;
  return(
    <div style={{position:"fixed",inset:0,zIndex:55,display:"flex",alignItems:"center",
      justifyContent:"center",pointerEvents:"none",
      background:"rgba(0,0,0,0.55)",animation:"fadeIn 0.2s"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,
        animation:"enemyActIn 0.45s cubic-bezier(.15,1.1,.3,1)"}}>
        <div style={{fontSize:16,fontWeight:900,letterSpacing:4,color,fontFamily:"Georgia,serif",
          textShadow:`0 0 28px ${color}dd,0 2px 10px rgba(0,0,0,0.95)`}}>
          {isE1?`⚔ ${(e1Nick||"Стражник").toUpperCase()} ДЕЙСТВУЕТ`:`🌑 ${(e2Nick||"Лазутчик").toUpperCase()} ДЕЙСТВУЕТ`}
        </div>
        <div style={{position:"relative",width:W,height:H,
          filter:`drop-shadow(0 0 30px ${def.c}bb)drop-shadow(0 0 12px rgba(0,0,0,0.95))`}}>
          <div style={{position:"absolute",left:artL,top:artT,width:artW,height:artH,overflow:"hidden",zIndex:1}}>
            {ART[type]?<img src={ART[type]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:44,background:"rgba(10,8,5,0.9)"}}>{def.e}</div>}
          </div>
          <div style={{position:"absolute",left:titleL,top:titleT,width:titleW,height:titleH,zIndex:3,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:9,fontWeight:700,color:"#e8d090",fontFamily:"Georgia,serif",
              letterSpacing:0.5,textShadow:"0 1px 3px #000"}}>{def.n}</span>
          </div>
          <div style={{position:"absolute",left:pL,top:pT,width:pW,height:pH,zIndex:3,
            display:"flex",alignItems:"center",justifyContent:"center",padding:"2px 3px",textAlign:"center"}}>
            <span style={{fontSize:8,color:"#5a3a18",fontFamily:"Georgia,serif",lineHeight:1.3}}>{def.d}</span>
          </div>
          <img src={FR} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",
            objectFit:"fill",zIndex:2,pointerEvents:"none"}}/>
        </div>
        <div style={{fontSize:12,color:"#c8b080",fontFamily:"Georgia,serif",letterSpacing:1,
          background:"rgba(0,0,0,0.7)",padding:"5px 14px",borderRadius:6,
          border:`1px solid ${color}44`,textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>
          {def.e} {def.n} — {def.d}
        </div>
      </div>
    </div>
  );
}

function Bubble({m,nick}){
  const ia=m.from==="alex";
  const letter=ia?(nick||"С").charAt(0).toUpperCase():"Я";
  return(
    <div style={{marginBottom:10,display:"flex",gap:7,alignItems:"flex-start",
      flexDirection:ia?"row":"row-reverse",animation:"fadeIn 0.25s"}}>
      <div style={{width:26,height:26,borderRadius:"50%",background:ia?"#4caf82":"#4c7fe0",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
        color:"#fff",fontWeight:700,flexShrink:0,fontFamily:"Georgia,serif"}}>{letter}</div>
      <div style={{fontSize:12,lineHeight:1.6,color:"#c4b090",maxWidth:"88%",
        background:ia?"rgba(76,175,130,0.1)":"rgba(76,127,224,0.1)",
        padding:"8px 11px",borderRadius:8,
        border:`1px solid ${ia?"rgba(76,175,130,0.25)":"rgba(76,127,224,0.25)"}`,
        fontFamily:"Georgia,serif"}}>{m.text}</div>
    </div>
  );
}

function LogLine({text,e1Nick="Стражник",e2Nick="Лазутчик",allyNick="Союзник"}){
  // Replace internal "Союзник" key with the actual ally nickname for display
  const displayText=allyNick!=="Союзник"?text.replace(/Союзник/g,allyNick):text;
  if(displayText.startsWith("──")){
    return(
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",opacity:0.5}}>
        <div style={{flex:1,borderTop:"1px solid rgba(200,160,80,0.07)"}}/>
        <span style={{fontSize:8,color:"#2a1808",fontFamily:"Georgia,serif",whiteSpace:"nowrap"}}>{displayText}</span>
        <div style={{flex:1,borderTop:"1px solid rgba(200,160,80,0.07)"}}/>
      </div>
    );
  }
  let icon,color,fw=400;
  if(text.includes("КОМБО")||text.includes("СТЕНА")||text.includes("НАТИСК")||text.includes("ЦЕПЬ")){
    icon="✨";color="#e09a3c";fw=700;
  } else if(text.includes("Союзник")||text.includes("СОВМЕСТНЫЙ")||text.includes("👥")){
    icon="👥";color="#4caf82";
  } else if(text.includes("изнурение")||text.includes("😓")){
    icon="⚠️";color="#c06030";
  } else if(text.includes("☠")&&(text.includes("Яд")||text.includes("тика"))||text.includes("Кровь")){
    icon="☠️";color="#9060c0";
  } else if(text.includes("🛡️")||text.includes("+10HP")||text.includes("+12HP")||text.includes("💉")){
    icon="🛡️";color="#4c7fe0";
  } else if(text.includes("Ты")){
    icon="⚔️";color="#6090e0";
  } else if(text.includes(e1Nick)||text.includes(e2Nick)||text.includes("ВРАГИ")){
    icon="⚔️";color="#a04040";
  } else {
    icon="▸";color="#5a4a30";
  }
  return(
    <div style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:12,color,
      padding:"3px 0",fontFamily:"Georgia,serif",
      borderBottom:"1px solid rgba(255,255,255,0.03)",fontWeight:fw,lineHeight:1.45}}>
      <span style={{flexShrink:0,minWidth:16,textAlign:"center"}}>{icon}</span>
      <span>{displayText}</span>
    </div>
  );
}

/* ── Status effects badges (poison / bleed ticks) ─────────────────────────── */
const POISON_ICON = "/assets/poisonicon.png";
const BLEED_ICON  = "/assets/bloodicon.png";

function EffectBadge({type,stacks,color,bg,border}){
  const [tip,setTip]=useState(false);
  const totalDmg=type==="poison"?stacks*5:stacks*3;
  const tipText=type==="poison"
    ?`Яд: ещё ${plRu(stacks,"ход","хода","ходов")} по −5 здоровья\nОсталось −${totalDmg} здоровья суммарно`
    :`Кровотечение: ещё ${plRu(stacks,"ход","хода","ходов")} по −3 здоровья\nОсталось −${totalDmg} здоровья суммарно`;
  return(
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",gap:3,
      background:bg,border:`1px solid ${border}`,
      borderRadius:5,padding:"2px 7px",cursor:"default",
      animation:stacks===1?"pulse 1s infinite":undefined}}
      onMouseEnter={()=>setTip(true)} onMouseLeave={()=>setTip(false)}>
      <img src={type==="poison"?POISON_ICON:BLEED_ICON} alt=""
        style={{width:22,height:22,objectFit:"contain"}}/>
      <span style={{fontSize:12,color,fontFamily:"Georgia,serif",fontWeight:700}}>{stacks}</span>
      {tip&&(
        <div className="effect-tooltip">{tipText}</div>
      )}
    </div>
  );
}

/* ── AvatarImg — renders image with letter fallback on error ─────────── */
function AvatarImg({src, fallback, style}){
  const [failed,setFailed]=useState(false);
  if(!src||failed) return <>{fallback}</>;
  return <img src={src} alt="" style={style} onError={()=>setFailed(true)}/>;
}

function EffectBadges({poison,bleed}){
  if(!poison&&!bleed)return null;
  return(
    <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
      {poison>0&&<EffectBadge type="poison" stacks={poison} color="#7bc67e" bg="rgba(123,198,126,0.13)" border="rgba(123,198,126,0.35)"/>}
      {bleed>0&&<EffectBadge type="bleed" stacks={bleed} color="#cc3344" bg="rgba(204,51,68,0.13)" border="rgba(204,51,68,0.35)"/>}
    </div>
  );
}

function TrapAnimation({ trigger }) {
  if (!trigger) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s",
    }}>
      <div style={{
        fontSize: 80, animation: "trapPop 1.2s cubic-bezier(.15,1.2,.3,1)",
        filter: "drop-shadow(0 0 30px rgba(217,119,6,0.9))",
        textShadow: "0 0 40px rgba(217,119,6,1)",
      }}>🪤</div>
      <div style={{
        position: "absolute", top: "55%", left: "50%", transform: "translateX(-50%)",
        fontSize: 22, fontWeight: 900, color: "#d97706", fontFamily: "Georgia, serif",
        letterSpacing: 3, textShadow: "0 0 20px rgba(217,119,6,0.8)",
        animation: "fadeIn 0.3s 0.2s both",
      }}>ЛОВУШКА СРАБОТАЛА!</div>
    </div>
  );
}

function CounterAnimation({ trigger }) {
  if (!trigger) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s",
    }}>
      <div style={{
        fontSize: 80, animation: "trapPop 1.2s cubic-bezier(.15,1.2,.3,1)",
        filter: "drop-shadow(0 0 30px rgba(6,182,212,0.9))",
      }}>↩️</div>
      <div style={{
        position: "absolute", top: "55%", left: "50%", transform: "translateX(-50%)",
        fontSize: 22, fontWeight: 900, color: "#06b6d4", fontFamily: "Georgia, serif",
        letterSpacing: 3, textShadow: "0 0 20px rgba(6,182,212,0.8)",
        animation: "fadeIn 0.3s 0.2s both",
      }}>КОНТРУДАР! −{trigger.dmg} HP</div>
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────────────────────────── */
/* ── Condition Brief screen shown between Survey1 and game start ─────── */
function ConditionBriefScreen({ condition, ingroup, partnerAvatar, allyNick, onStart }) {
  const gt = getGroupText(ingroup);
  const partnerLine = `В этой игре вы будете играть в одной команде с человеком, который считает, что дела в России идут в ${gt.outDir} направлении.`;
  const opponentLine =
    condition === "cond_1"
      ? `Вместе вы будете играть против команды, которая считает, что дела в России идут в ${gt.inDir} направлении.`
      : condition === "cond_2"
      ? `Вместе вы будете играть против другой команды, участники которой также считают, что дела в России идут в ${gt.outDir} направлении.`
      : "Вместе вы будете играть против команды, участники которой не определились со своей позицией по поводу происходящего в стране.";
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(6,4,2,0.97)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:1500,backdropFilter:"blur(8px)",
      padding:"32px 16px"}}>
      <div style={{background:"#faf8f4",borderRadius:12,padding:"44px 48px",maxWidth:600,
        width:"100%",fontFamily:"Georgia, serif",boxShadow:"0 24px 80px rgba(0,0,0,0.7)",
        animation:"scaleIn 0.25s ease"}}>
        <div style={{fontSize:18,fontWeight:700,color:"#1a1410",marginBottom:28,
          borderBottom:"2px solid #e8e4de",paddingBottom:14}}>
          Ваша команда
        </div>
        <div style={{display:"flex",gap:24,alignItems:"flex-start",marginBottom:28}}>
          <div style={{width:80,height:80,borderRadius:"50%",flexShrink:0,overflow:"hidden",
            border:"3px solid #e8e4de",boxShadow:"0 4px 16px rgba(0,0,0,0.15)",
            background:"#d8d4ce",display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:32,color:"#a09888",fontFamily:"Georgia,serif"}}>
            <AvatarImg src={partnerAvatar} fallback="?"
              style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div>
            <div style={{fontSize:11,letterSpacing:1.5,color:"#b0a898",marginBottom:4,fontFamily:"Georgia,serif"}}>
              ВАШ СОЮЗНИК
            </div>
            {allyNick&&allyNick!=="Союзник"&&(
              <div style={{fontSize:16,fontWeight:700,color:"#1a1410",marginBottom:8,fontFamily:"Georgia,serif"}}>
                {allyNick}
              </div>
            )}
            <div style={{fontSize:14,lineHeight:1.75,color:"#3a3228",marginBottom:14,fontFamily:"Georgia,serif"}}>
              {partnerLine}
            </div>
            <div style={{fontSize:14,lineHeight:1.75,color:"#3a3228",fontFamily:"Georgia,serif"}}>
              {opponentLine}
            </div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button onClick={onStart} style={{background:"linear-gradient(135deg,#1a3a5c,#2d6496)",
            color:"#fff",border:"none",borderRadius:8,padding:"13px 46px",fontSize:14,
            fontWeight:700,letterSpacing:0.5,cursor:"pointer",fontFamily:"Georgia,serif",
            boxShadow:"0 4px 20px rgba(45,100,150,0.3)",transition:"all 0.2s"}}>
            Начать игру →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Matchmaking screen ─────────────────────────────────────────────── */
function MatchmakingScreen({onReady}){
  const [found,setFound]=useState(false);
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    const delay=10000+Math.floor(Math.random()*20001); // 10–30 s
    const t1=setTimeout(()=>setFound(true),delay);
    const t2=setTimeout(()=>onReady(),delay+1800);
    const ti=setInterval(()=>setTick(n=>n+1),500);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearInterval(ti);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const dots=".".repeat((tick%3)+1);
  return(
    <div style={{position:"fixed",inset:0,zIndex:9000,
      background:"radial-gradient(ellipse at center,#1a1005 0%,#0a0800 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32}}>
      <div style={{fontSize:13,letterSpacing:4,color:"#6a5030",fontFamily:"Georgia,serif",textTransform:"uppercase"}}>
        Дружина
      </div>
      {!found?(
        <>
          <div style={{width:72,height:72,borderRadius:"50%",border:"3px solid #4a3010",
            borderTopColor:"#c8a050",animation:"spin 1s linear infinite"}}/>
          <div style={{fontSize:16,color:"#c8a050",fontFamily:"Georgia,serif",letterSpacing:1}}>
            Ищём противников{dots}
          </div>
          <div style={{fontSize:11,color:"#5a4020",fontFamily:"Georgia,serif"}}>
            Подбираем игроков по уровню
          </div>
        </>
      ):(
        <>
          <div style={{fontSize:44,filter:"drop-shadow(0 0 12px #4caf82)"}}>⚔️</div>
          <div style={{fontSize:18,color:"#4caf82",fontFamily:"Georgia,serif",fontWeight:700,letterSpacing:1}}>
            Игра найдена!
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function App(){
  const [showTutorial,setShowTutorial]=useState(()=>localStorage.getItem("tutorialDone")!=="true");
  const [showMatchmaking,setShowMatchmaking]=useState(false);
  const [gameInit]=useState(createGameInit);
  const [gs,setGs]=useState(initGs);
  const [hand,setHand]=useState(gameInit.hand);
  const [sharedDeck,setSharedDeck]=useState(gameInit.deck);
  const [fatigueCycle,setFatigueCycle]=useState(gameInit.fatigueCycle);
  const [pendingDrawCard,setPendingDrawCard]=useState(null);
  const [mulliganMarked,setMulliganMarked]=useState(()=>new Set());
  const [played,setPlayed]=useState([]);
  const [jointCard,setJC]=useState(null);
  const [jointReady,setJR]=useState(false);
  const [jointTarget,setJointTarget]=useState(null);
  const [phase,setPhase]=useState("mulligan");
  const [winner,setWinner]=useState(null);
  const [log,setLog]=useState([]);
  const [chat,setChat]=useState([]);
  const [input,setInput]=useState("");
  const [turn,setTurn]=useState(1);
  const [loading,setLoad]=useState(false);
  const [flash,setFlash]=useState({});
  const [shaking,setShake]=useState(null);
  const [od,setOd]=useState(2);
  const [odBank,setOdBank]=useState(0);
  const [comboGlow,setComboGlow]=useState(null);
  const [preview,setPreview]=useState(null);
  const [enemyCard,setEnemyCard]=useState({e1:null,e2:null});
  const [reviveAnim,setReviveAnim]=useState(false);
  const [e1Hand,setE1Hand]=useState(gameInit.e1Hand);
  const [e2Hand,setE2Hand]=useState(gameInit.e2Hand);
  const [alexHand,setAlexHand]=useState(gameInit.alexHand);
  const [lastActions,setLastActions]=useState({e1:"",e2:"",alex:""});
  const [typing,setTyping]=useState(false);
  const [tradeOffer,setTradeOffer]=useState(null); // {type,idx}
  const [tradeSel,setTradeSel]=useState(null); // uid of player card selected for trade
  const [tradeUsed,setTradeUsed]=useState(false);
  const [thinking,setThinking]=useState({e1:false,e2:false,alex:false});
  const [drawCooldown,setDrawCooldown]=useState(0);
  const [cooperationScore,setCoopScore]=useState(0);
  const chatEnd=useRef(null);
  const logEnd=useRef(null);
  const prevPhaseRef=useRef(phase);
  const setupFileRef=useRef(null);
  const skipTurnRef=useRef(null);
  const deathLoggedRef=useRef(false);
  const animQueueRef=useRef([]);
  const animPlayingRef=useRef(false);
  const [animating,setAnimating]=useState(false);
  const [showSetup,setShowSetup]=useState(false);
  const [playerName,setPlayerName]=useState(()=>localStorage.getItem("playerName")||"");
  const [playerAvatar,setPlayerAvatar]=useState(()=>localStorage.getItem("player_avatar")||null);
  const [setupName,setSetupName]=useState("");
  const [setupAvatarImg,setSetupAvatarImg]=useState(null);
  const [showComboRef,setShowComboRef]=useState(false);

  const [showSurvey1,setShowSurvey1]=useState(true);
  const [showSurvey2,setShowSurvey2]=useState(false);
  const [survey1Data,setSurvey1Data]=useState(null);
  const [survey2Data,setSurvey2Data]=useState(null);
  const [blockOrder]=useState(()=>{
    const saved=localStorage.getItem("block_order");
    if(saved==="approve_first"||saved==="disapprove_first")return saved;
    const order=Math.random()<0.5?"approve_first":"disapprove_first";
    localStorage.setItem("block_order",order);
    return order;
  });
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<=767);
  const [activeTab,setActiveTab]=useState("battle");
  const activeTabRef=useRef("battle");
  const switchTab=(tab)=>{setActiveTab(tab);activeTabRef.current=tab;};
  const [unreadChat,setUnreadChat]=useState(0);
  const chatMsgCountRef=useRef(0);
  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth<=767);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);
  // showExport removed — export is now server-side via /api/export
  const [showCondBrief,setShowCondBrief]=useState(false);
  const [condition,setCondition]=useState(null);
  const [gameAvatars,setGameAvatars]=useState(null); // {avatar_partner, avatar_opponent_1, avatar_opponent_2}
  const [allyNick,setAllyNick]=useState(()=>localStorage.getItem("ally_nick")||"Союзник");
  const [allyPersona,setAllyPersona]=useState(null);
  const [e1Nick,setE1Nick]=useState(()=>localStorage.getItem("e1_nick")||"Стражник");
  const [e2Nick,setE2Nick]=useState(()=>localStorage.getItem("e2_nick")||"Лазутчик");
  const en=k=>k==="e1"?e1Nick:e2Nick;
  const [trapTrigger,setTrapTrigger]=useState(null);
  const [counterTrigger,setCounterTrigger]=useState(null);
  const lastAlexSpeakRef=useRef(0);
  const allyDownSentRef=useRef(false);

  useEffect(()=>{setChat([]);},[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  useEffect(()=>{logEnd.current?.scrollIntoView({behavior:"smooth"});},[log]);
  // Keep ref to latest skipTurn to avoid stale closure in auto-skip effect
  useEffect(()=>{skipTurnRef.current=skipTurn;});
  // Save ts_game_end, outcome, turns, chat count when game ends
  useEffect(()=>{
    if(phase==="over"){
      const session=getCurrentSession();
      if(session){
        const updated={
          ...session,
          ts_game_end:new Date().toISOString(),
          game_outcome:winner??"unknown",
          game_turns:turn,
          chat_messages_sent:chatMsgCountRef.current,
          block_order:localStorage.getItem("block_order")??blockOrder,
          cooperation_score:cooperationScore,
        };
        saveCurrentSession(updated);
        upsertResponse(updated);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase]);

  // Restore condition + gameAvatars + persona from session on mount
  useEffect(()=>{
    const session=getCurrentSession();
    if(session?.condition) setCondition(session.condition);
    if(session?.avatar_partner){
      setGameAvatars({
        avatar_partner:    session.avatar_partner,
        avatar_opponent_1: session.avatar_opponent_1,
        avatar_opponent_2: session.avatar_opponent_2,
      });
    }
    if(session?.ally_nick){
      setAllyNick(session.ally_nick);
      // Restore persona so chat works after page reload
      const ingroup=session.s1_ingroup??(session.ingroup??"");
      if(!session.condition||!ingroup) console.warn("restorePersona: missing condition or ingroup",{condition:session.condition,ingroup});
      setAllyPersona(selectPersona(session.condition,ingroup));
    }
    if(session?.e1_nick) setE1Nick(session.e1_nick);
    if(session?.e2_nick) setE2Nick(session.e2_nick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Ctrl+Shift+E shortcut removed — export is now at /api/export-csv?secret=YOUR_SECRET
  // Banner when turn becomes player's after busy phase
  useEffect(()=>{
    if(phase==="player"&&prevPhaseRef.current==="busy"){
      showBanner("▶ ТВОЙ ХОД","#4caf82");
    }
    prevPhaseRef.current=phase;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase]);
  // Auto-skip when player is dead but game continues (log only once)
  useEffect(()=>{
    if(phase==="player"&&gs.you.hp<=0&&!loading){
      if(!deathLoggedRef.current){
        addLog("⚰️ Ты без сознания. Напарник сражается один.");
        deathLoggedRef.current=true;
      }
      const t=setTimeout(()=>skipTurnRef.current?.(),1800);
      return()=>clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,gs.you.hp,loading]);

  const addLog=t=>setLog(l=>[...l,t]);
  const addChat=(from,text)=>{
    setChat(c=>[...c,{from,text}]);
    if(from==="alex")setUnreadChat(n=>activeTabRef.current==="chat"?n:n+1);
    if(from==="you")chatMsgCountRef.current+=1;
  };
  const doFlash=(key,dmg)=>{
    setFlash(f=>({...f,[key]:dmg}));
    if(dmg>=8){setShake(key);setTimeout(()=>setShake(null),420);}
    setTimeout(()=>setFlash(f=>{const n={...f};delete n[key];return n;}),800);
  };

  /* ── Animation queue ─────────────────────────────────────────────────── */
  const dly=ms=>new Promise(r=>setTimeout(r,ms));
  const enqueue=animFn=>{animQueueRef.current.push(animFn);if(!animPlayingRef.current)processQueue();};
  const processQueue=async()=>{
    if(animQueueRef.current.length===0){animPlayingRef.current=false;setAnimating(false);return;}
    animPlayingRef.current=true;setAnimating(true);
    const fn=animQueueRef.current.shift();
    await fn();
    await dly(400);
    processQueue();
  };
  const showBanner=(text,color='#e8d090')=>{
    const el=document.createElement('div');el.className='event-banner';
    el.style.color=color;el.textContent=text;document.body.appendChild(el);
    setTimeout(()=>el.remove(),2500);
  };
  const showComboBanner=(name,imgSrc=null)=>{
    const el=document.createElement('div');el.className='combo-banner';
    if(imgSrc){const img=document.createElement('img');img.src=imgSrc;img.style.cssText='width:32px;height:32px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:8px;';el.appendChild(img);}
    el.appendChild(document.createTextNode(`✨ КОМБО: ${name.toUpperCase()}`));
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),2400);
  };
  const flashEntity=(key,isHeal=false)=>{
    const el=document.querySelector(`[data-entity="${key}"]`);if(!el)return;
    el.style.transition='background 0.15s';
    el.style.background=isHeal?'rgba(40,180,80,0.35)':'rgba(200,40,40,0.35)';
    setTimeout(()=>{el.style.background='';},300);
  };
  const floatNumber=(key,value,isHeal=false)=>{
    const base=document.querySelector(`[data-entity="${key}"]`);if(!base)return;
    const rect=base.getBoundingClientRect();
    const el=document.createElement('div');
    el.style.cssText=`position:fixed;left:${rect.left+rect.width/2}px;top:${rect.top}px;`+
      `color:${isHeal?'#60d080':'#ff5050'};font-size:20px;font-weight:bold;`+
      `pointer-events:none;z-index:600;text-shadow:0 2px 4px rgba(0,0,0,0.8);`+
      `animation:floatUp 1s ease forwards;transform:translateX(-50%);`;
    el.textContent=isHeal?`+${value}`:`-${value}`;document.body.appendChild(el);
    setTimeout(()=>el.remove(),1000);
  };
  const doEvent=(key,value,text,color,isHeal=false)=>{
    doFlash(key,isHeal?0:value);
    enqueue(async()=>{flashEntity(key,isHeal);floatNumber(key,value,isHeal);showBanner(text,color);await dly(600);});
  };

  /* ── LLM helper (OpenRouter / Claude Haiku) ─────────────────────────── */
  const llmChat=async(systemPrompt,userMessage,fallback,history=[])=>{
    try{
      const messages=[
        {role:"system",content:systemPrompt},
        ...history.slice(-4).map(m=>({
          role:m.from==="alex"?"assistant":"user",
          content:m.text,
        })),
        {role:"user",content:userMessage},
      ];
      const r=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"anthropic/claude-haiku-4-5",
          max_tokens:80,
          temperature:0.95,
          messages,
        }),
      });
      const d=await r.json();
      return d.choices?.[0]?.message?.content??fallback;
    }catch(err){console.error("llmChat error:",err);return fallback;}
  };

  const usedOd=played.reduce((s,p)=>s+CARDS[p.card.type].od,0)
    +(jointCard?CARDS.joint.od:0);
  const odLeft=od-usedOd;

  /* ── Preview logic ───────────────────────────────────────────────────── */
  const handlePreview=card=>{
    if(phase!=="player"||loading)return;
    setPreview(card);
  };

  const handleApply=card=>{
    const def=CARDS[card.type];
    const sel=played.find(p=>p.card.uid===card.uid);
    const jp=jointCard?.uid===card.uid;
    if(sel){setPlayed(pl=>pl.filter(p=>p.card.uid!==card.uid));setPreview(null);return;}
    if(jp){setJC(null);setJR(false);setJointTarget(null);setPreview(null);return;}
    if(odLeft<def.od)return;
    if(def.t===null&&card.type!=="joint"){
      setPlayed(pl=>[...pl,{card,target:null}]);
      setPreview(null);
    }
  };

  const handleTarget=(card,tgt)=>{
    const def=CARDS[card.type];
    if(odLeft<def.od)return;
    if(card.type==="joint"){setJC(card);setPreview(null);askAlexJoint(tgt);}
    else{setPlayed(pl=>[...pl,{card,target:tgt}]);setPreview(null);}
  };

  /* ── alexSpeak — situational chat via LLM ───────────────────────────── */
  // Minimal emergency strings used ONLY when network fails on forced events
  const EMERGENCY_MSG={trade_offer:"поменяемся?",trade_accepted:"ок",trade_declined:"ок",
    victory:"gg",defeat:"бывает",ally_down:"нужна карта Возрождения",revived:"спасибо"};
  const alexSpeak=async(eventType,g)=>{
    const now=Date.now();
    if(eventType==="ally_down"){if(allyDownSentRef.current)return;allyDownSentRef.current=true;}
    if(eventType==="revived"){allyDownSentRef.current=false;}
    const forceSpeak=["trade_offer","victory","defeat","trade_accepted","trade_declined","ally_down","revived"].includes(eventType);
    if(!forceSpeak&&now-lastAlexSpeakRef.current<30000)return;
    lastAlexSpeakRef.current=now;
    const persona=allyPersona;
    const nick=allyNick;
    if(!persona){if(forceSpeak&&EMERGENCY_MSG[eventType])addChat("alex",EMERGENCY_MSG[eventType]);return;}
    const allyHp=g?.alex?.hp??"?";
    const youHp=g?.you?.hp??"?";
    const hand=alexHand.map(type=>({
      name:CARDS[type]?.n??type,
      cost:CARDS[type]?.od??1,
      desc:CARDS[type]?.d??"",
    }));
    const ctx={allyHp,youHp,
      enemies:["e1","e2"].filter(k=>g?.[k]?.hp>0).map(k=>`${en(k)} ${g[k].hp}HP`).join(", ")||"повержены",
      hand,
    };
    // Card-aware tactical hints
    const healCard=hand.find(c=>c.name==="ИСЦЕЛИТЬ");
    const shieldCard=hand.find(c=>c.name==="ЩИТ");
    const reviveCard=hand.find(c=>c.name==="ВОЗРОЖДЕНИЕ");
    const tacticalNote=(
      healCard&&typeof youHp==="number"&&youHp<55 ? `У тебя есть карта ИСЦЕЛИТЬ — у партнёра ${youHp} здоровья, можешь предложить его вылечить.` :
      typeof allyHp==="number"&&allyHp<30&&!healCard ? `Твоё здоровье критически низкое (${allyHp}/100). Попроси партнёра тебя вылечить или прикрыть.` :
      shieldCard&&typeof allyHp==="number"&&allyHp<45 ? `У тебя ${allyHp} здоровья и есть ЩИТ — можешь сказать что поставишь щит.` :
      reviveCard&&typeof allyHp==="number"&&allyHp<=0 ? `Ты пал, но у партнёра есть ВОЗРОЖДЕНИЕ — намекни что ждёшь воскрешения.` : ""
    );
    const hints={
      trade_offer:`Предложи партнёру обменяться картой. Одна короткая реплика, каждый раз разными словами. Пиши как обычный игрок: поменяемся? / у меня лишнее / глянь что есть / возьмёшь?`,
      trade_accepted:`Партнёр принял обмен. Одна короткая реакция: ок / збс / давай / норм. Каждый раз по-разному.`,
      trade_declined:`Партнёр отказался. Одна спокойная фраза: ладно / ок / понял / ну ок.`,
      low_hp:`Здоровье очень низкое (твоё: ${allyHp}/100, партнёра: ${youHp}/100). ${tacticalNote||""} Напиши практично: есть хил? похилишь? плохо. надо что-то делать. Одна фраза.`,
      enemy_low_hp:`Враги почти добиты (${ctx.enemies}). Одна короткая реплика: добиваем / ещё чуть / го / почти.`,
      took_heavy_hit:`Партнёр получил сильный удар, у него ${youHp} здоровья. ${tacticalNote||""} Коротко: держись / плохо / похилить? / нужна помощь? Одна фраза, каждый раз другими словами.`,
      victory:`Победили. Одна фраза: gg / сделали / уф / норм сыграли / молодцы. В своём стиле.`,
      defeat:`Проиграли. Одна фраза без нытья: бывает / ну и ладно / gg / не повезло.`,
      joint_combo:`Только что нанесли совместный удар. Короткая реакция: вот это да / норм / да / или просто [SKIP].`,
      ally_down:`Ты упал в бою (здоровье = 0). Напиши партнёру что пал и нужно воскрешение. Коротко, своими словами.`,
      revived:`Партнёр тебя воскресил. Одна короткая благодарность: спасибо / жив / выручил / ок. Каждый раз по-разному.`,
    };
    const text=await llmChat(
      persona.getSystemPrompt(nick),
      hints[eventType]??"Скажи что-нибудь уместное по ситуации в бою — очень коротко.",
      EMERGENCY_MSG[eventType]??null,
      chat.slice(-4)
    );
    if(text&&text!==SKIP)addChat("alex",text);
    else if(forceSpeak&&EMERGENCY_MSG[eventType])addChat("alex",EMERGENCY_MSG[eventType]);
  };

  /* ── Alex joint ─────────────────────────────────────────────────────── */
  const askAlexJoint=async t=>{
    setJointTarget(t);setLoad(true);
    setThinking(th=>({...th,alex:true}));
    await dly(800+rnd(1200));
    setThinking(th=>({...th,alex:false}));
    const canJoin=alexHand.includes("joint");
    const ctx={
      allyHp:gs.alex.hp,youHp:gs.you.hp,
      enemies:["e1","e2"].filter(k=>gs[k].hp>0).map(k=>`${en(k)} ${gs[k].hp}HP`).join(", ")||"повержены",
      hand:alexHand.map(type=>({name:CARDS[type]?.n??type,cost:CARDS[type]?.od??1,desc:CARDS[type]?.d??""})),
    };
    const sys=allyPersona?.getSystemPrompt(allyNick)??`Ты игрок ${allyNick} в карточной игре.`;
    const prompt=canJoin
      ?`Партнёр предлагает совместный удар по ${en(t)} (${gs[t].hp} здоровья). У тебя есть нужная карта. Скажи кратко что готов, 1 фраза.`
      :`Партнёр предлагает совместный удар по ${en(t)} (${gs[t].hp} здоровья). Нужной карты нет. Скажи кратко что не можешь, 1 фраза.`;
    const fallback=canJoin?"Готов, бьём!":"Нет нужной карты сейчас.";
    const txt=await llmChat(sys,prompt,fallback,chat.slice(-4));
    addChat("alex",txt);
    setJR(canJoin||(txt.toLowerCase().includes("готов")||txt.toLowerCase().includes("давай")||txt.toLowerCase().includes("бьём")));
    setLoad(false);
  };

  /* ── Enemy turn — shared deck ──────────────────────────────────────── */
  const enemyAct=(g,logs,t,e1hIn,e2hIn,deckIn,cycleIn)=>{
    let e1Card=null,e2Card=null;
    let ng={you:{...g.you},alex:{...g.alex},e1:{...g.e1},e2:{...g.e2}};
    const hits={};
    const hit=(k,d)=>{hits[k]=(hits[k]??0)+d;};
    let nd=[...deckIn],nc=cycleIn;
    let newE1h=[...e1hIn],newE2h=[...e2hIn];

    // Draw N card types from shared deck into a hand array
    const drawInto=(hand,n)=>{
      const h=[...hand];
      for(let i=0;i<n;i++){if(nd.length===0){nd=shuffle([...DECK_TEMPLATE]);nc++;}h.push(nd.shift());}
      return h;
    };
    // Pick one random card from hand, remove it, draw replacement
    const pickCard=(hand)=>{
      if(hand.length===0){if(nd.length===0){nd=shuffle([...DECK_TEMPLATE]);nc++;}return{card:nd.shift(),newHand:[]};}
      const idx=rnd(hand.length);const card=hand[idx];
      const remaining=hand.filter((_,i)=>i!==idx);
      if(nd.length===0){nd=shuffle([...DECK_TEMPLATE]);nc++;}
      return{card,newHand:[...remaining,nd.shift()]};
    };

    // Apply an enemy's card: reuses player card types with enemy-appropriate interpretation
    const applyEnemyCard=(card,actor)=>{
      const name=actor==="e1"?en("e1"):en("e2");
      const allyKey=actor==="e1"?"e2":"e1";
      // Target selection — varied and strategic
      const chooseTgt=()=>{
        const youAlive=ng.you.hp>0;
        const alexAlive=ng.alex.hp>0;
        if(!youAlive)return"alex";
        if(!alexAlive)return"you";
        // Avoid players with trap/counter active
        if(ng.you.trap&&!ng.alex.trap)return"alex";
        if(ng.you.counter&&!ng.alex.counter)return"alex";
        // 40% random target, 60% target whoever has less HP
        if(Math.random()<0.4)return Math.random()<0.5?"you":"alex";
        return ng.you.hp<=ng.alex.hp?"you":"alex";
      };
      // Strategic override for aggressive cards — bots sometimes play defensively
      const isAggressive=["attack","double","rage","poison","bleed"].includes(card);
      const selfHpPct=ng[actor].hp/(ng[actor].maxHp||100);
      const allyHpPct=ng[allyKey].hp>0?ng[allyKey].hp/(ng[allyKey].maxHp||100):1;
      let effectiveCard=card;
      if(isAggressive){
        if(selfHpPct<0.4&&Math.random()<0.6)effectiveCard="shield";
        else if(allyHpPct<0.35&&ng[allyKey].hp>0&&Math.random()<0.5)effectiveCard="healAlex";
        else if(Math.random()<0.18)effectiveCard="shield"; // occasional defensive play
      }
      const tgt=chooseTgt();
      // Basic attack with trap/counter check
      const basicAtk=(target,dmg,emoji="⚔️")=>{
        let d=dmg;
        if(target==="you"&&ng.you.trap){ng.you={...ng.you,trap:false};ng[actor]={...ng[actor],hp:cl(ng[actor].hp-10,0,999)};hit(actor,10);logs.push(`🪤 Ловушка! ${name} −10HP`);setTrapTrigger({actor});setTimeout(()=>setTrapTrigger(null),1400);d=0;}
        if(target==="you"&&ng.you.counter&&d>0){const counterDmg=d;ng.you={...ng.you,counter:false};ng[actor]={...ng[actor],hp:cl(ng[actor].hp-counterDmg,0,999)};hit(actor,counterDmg);logs.push(`↩️ Контрудар! ${name} −${counterDmg}HP`);setCounterTrigger({actor,dmg:counterDmg});setTimeout(()=>setCounterTrigger(null),1400);d=0;}
        if(d>0){ng[target]={...ng[target],hp:cl(ng[target].hp-d,0,ng[target].maxHp)};hit(target,d);logs.push(`${name} ${emoji}→${target==="you"?"тебя":"Союзника"}: −${d}`);}
      };
      switch(effectiveCard){
        case"shield": ng[actor]={...ng[actor],hp:cl(ng[actor].hp+10,0,ng[actor].maxHp)};logs.push(`${name} 🛡️: +10HP`);break;
        case"healAlex":
          if(ng[allyKey].hp>0){ng[allyKey]={...ng[allyKey],hp:cl(ng[allyKey].hp+12,0,ng[allyKey].maxHp)};logs.push(`${name} 💉→${en(allyKey)}: +12HP`);}
          else basicAtk(tgt,8);break;
        case"revive":
          if(ng[allyKey].hp<=0){ng[allyKey]={...ng[allyKey],hp:30};logs.push(`${name} ✨ возродил ${en(allyKey)} (30HP)!`);}
          else basicAtk(tgt,8);break;
        case"trap": ng[actor]={...ng[actor],trap:true};logs.push(`${name} 🪤: Ловушка!`);break;
        case"counter": ng[actor]={...ng[actor],counter:true};logs.push(`${name} ↩️: Контрудар готов`);break;
        case"attack": basicAtk(tgt,8);break;
        case"poison":
          if(ng[tgt].poison===0){ng[tgt]={...ng[tgt],poison:3};logs.push(`${name} ☠️→${tgt==="you"?"тебя":"Союзника"}: яд`);}
          else basicAtk(tgt,8);break;
        case"bleed": ng[tgt]={...ng[tgt],bleed:Math.min((ng[tgt].bleed??0)+4,8)};logs.push(`${name} 🩸→${tgt==="you"?"тебя":"Союзника"}: кровотечение`);break;
        case"rage":{let d=18;
          if(tgt==="you"&&ng.you.trap){ng.you={...ng.you,trap:false};ng[actor]={...ng[actor],hp:cl(ng[actor].hp-10,0,999)};hit(actor,10);logs.push(`🪤 Ловушка! ${name} −10HP`);d=0;}
          if(tgt==="you"&&ng.you.counter&&d>0){ng.you={...ng.you,counter:false};ng[actor]={...ng[actor],hp:cl(ng[actor].hp-d,0,999)};hit(actor,d);logs.push(`↩️ Контрудар! ${name} −${d}HP`);d=0;}
          if(d>0){ng[tgt]={...ng[tgt],hp:cl(ng[tgt].hp-d,0,ng[tgt].maxHp)};hit(tgt,d);logs.push(`${name} 🔥→${tgt==="you"?"тебя":"Союзника"}: −${d}`);}
          ng[actor]={...ng[actor],hp:cl(ng[actor].hp-4,0,999)};logs.push(`${name} ярость: −4HP себе`);break;}
        case"double":{const t2=tgt==="you"?"alex":"you";
          basicAtk(tgt,8,"⚔️⚔️");
          if(ng[t2].hp>0){ng[t2]={...ng[t2],hp:cl(ng[t2].hp-8,0,ng[t2].maxHp)};hit(t2,8);logs.push(`${name} ⚔️→${t2==="you"?"тебя":"Союзника"}: −8`);}break;}
        case"joint":
          if(ng[allyKey].hp>0){let d=18;
            if(tgt==="you"&&ng.you.counter){ng.you={...ng.you,counter:false};ng[actor]={...ng[actor],hp:cl(ng[actor].hp-d,0,999)};hit(actor,d);logs.push(`↩️ Контрудар! ${name} −${d}HP`);d=0;}
            if(d>0){ng[tgt]={...ng[tgt],hp:cl(ng[tgt].hp-d,0,ng[tgt].maxHp)};hit(tgt,d);logs.push(`${name}+${en(allyKey)}💥→${tgt==="you"?"тебя":"Союзника"}: −${d}`);}}
          else basicAtk(tgt,8);break;
        case"spy": newE1h=actor==="e1"?drawInto(newE1h,1):newE1h;newE2h=actor==="e2"?drawInto(newE2h,1):newE2h;logs.push(`${name} 🔍: доп. карта`);break;
        case"energy": newE1h=actor==="e1"?drawInto(newE1h,1):newE1h;newE2h=actor==="e2"?drawInto(newE2h,1):newE2h;logs.push(`${name} ⚡: доп. карта`);break;
        default: basicAtk(tgt,8);
      }
    };

    // Joint combo attack (both alive, turn>3, 25% chance)
    const bothAlive=ng.e1.hp>0&&ng.e2.hp>0;
    const doCombo=bothAlive&&t>3&&rnd(4)===0;
    if(doCombo){
      const r1=pickCard(newE1h);newE1h=r1.newHand;e1Card=r1.card;
      const r2=pickCard(newE2h);newE2h=r2.newHand;e2Card=r2.card;
      const tgt=ng.you.hp<=ng.alex.hp?"you":"alex";let d=22;
      if(tgt==="you"&&ng.you.counter){ng.you={...ng.you,counter:false};ng.e1={...ng.e1,hp:cl(ng.e1.hp-d,0,999)};hit("e1",d);logs.push(`↩️ Контрудар! ${en("e1")} −${d}HP`);d=0;}
      if(d>0&&ng.you.jcounter){const ret=Math.floor(d/2);ng.e1={...ng.e1,hp:cl(ng.e1.hp-ret,0,999)};hit("e1",ret);logs.push(`🔰 КОНТРУДАР! Совм. удар отменён! ${en("e1")} −${ret}HP`);ng.you={...ng.you,jcounter:null};d=0;}
      if(d>0){ng[tgt]={...ng[tgt],hp:cl(ng[tgt].hp-d,0,ng[tgt].maxHp)};hit(tgt,d);logs.push(`💥 ВРАГИ: Совм. удар → ${tgt==="you"?"тебя":"Союзника"}: −${d}!`);}
      const fdJ=fpCycle(cycleIn);if(fdJ>0){if(ng.e1.hp>0){ng.e1={...ng.e1,hp:cl(ng.e1.hp-fdJ,0,ng.e1.maxHp)};hit("e1",fdJ);logs.push(`${en("e1")} 😓 изнурение: −${fdJ}HP`);}if(ng.e2.hp>0){ng.e2={...ng.e2,hp:cl(ng.e2.hp-fdJ,0,ng.e2.maxHp)};hit("e2",fdJ);logs.push(`${en("e2")} 😓 изнурение: −${fdJ}HP`);}}
    } else {
      if(ng.e1.hp>0){const r=pickCard(newE1h);e1Card=r.card;newE1h=r.newHand;applyEnemyCard(r.card,"e1");const fd1=fpCycle(cycleIn);if(fd1>0&&ng.e1.hp>0){ng.e1={...ng.e1,hp:cl(ng.e1.hp-fd1,0,ng.e1.maxHp)};hit("e1",fd1);logs.push(`${en("e1")} 😓 изнурение: −${fd1}HP`);}}
      if(ng.e2.hp>0){const r=pickCard(newE2h);e2Card=r.card;newE2h=r.newHand;applyEnemyCard(r.card,"e2");const fd2=fpCycle(cycleIn);if(fd2>0&&ng.e2.hp>0){ng.e2={...ng.e2,hp:cl(ng.e2.hp-fd2,0,ng.e2.maxHp)};hit("e2",fd2);logs.push(`${en("e2")} 😓 изнурение: −${fd2}HP`);}}
    }
    // Poison + bleed ticks
    for(const k of["you","alex","e1","e2"]){
      if(ng[k]?.poison>0&&ng[k].hp>0){ng[k]={...ng[k],hp:cl(ng[k].hp-5,0,ng[k].maxHp),poison:ng[k].poison-1};logs.push(`☠ Яд (${k==="you"?"ты":k==="alex"?"Союзник":en(k)}): −5HP`);hit(k,5);}
      if(ng[k]?.bleed>0&&ng[k].hp>0){ng[k]={...ng[k],hp:cl(ng[k].hp-3,0,ng[k].maxHp),bleed:ng[k].bleed-1};logs.push(`🩸 Кровь (${k==="you"?"ты":k==="alex"?"Союзник":en(k)}): −3HP`);hit(k,3);}
    }
    // jcounter fallback — not consumed by joint attack → plain 4 HP hit
    if(ng.you.jcounter){const jct=ng.you.jcounter;if(ng[jct]?.hp>0){ng[jct]={...ng[jct],hp:cl(ng[jct].hp-4,0,ng[jct].maxHp)};hits[jct]=(hits[jct]??0)+4;logs.push(`🔰 Контрудар → ${en(jct)}: −4HP (совм. удара не было)`);}ng.you={...ng.you,jcounter:null};}
    return{ng,hits,e1Card,e2Card,newE1h,newE2h,deck:nd,cycle:nc};
  };

  /* ── Skip ───────────────────────────────────────────────────────────── */
  const skipTurn=async()=>{
    if(phase!=="player"||loading)return;
    setPhase("busy");setLoad(true);setPlayed([]);setJC(null);setJR(false);
    if(isMobile){setActiveTab("battle");activeTabRef.current="battle";}
    const nb=Math.min(odBank+1,1);
    addLog(`Ход ${turn}: Пропуск — +1 ОД в банк`);
    let g={you:{...gs.you},alex:{...gs.alex},e1:{...gs.e1},e2:{...gs.e2}};
    const logs=[];
    const ar=await alexTurnAPI(g,"",false);if(ar.message&&ar.message.trim()&&ar.message!==SKIP)addChat("alex",ar.message);
    let capDeck=[...sharedDeck];let capCycle=fatigueCycle;
    let newAlexH=[...alexHand];
    for(const a of(ar.actions??[]).slice(0,1)){
      // Remove one card from Alex's hand matching action type, draw replacement
      const pool=ALEX_ACTION_MAP[a.type]??["attack"];
      const usedIdx=newAlexH.findIndex(t=>pool.includes(t));
      if(usedIdx>=0){newAlexH=newAlexH.filter((_,i)=>i!==usedIdx);const{types:[nc],deck:nd,cycle:ncy}=drawRaw(1,capDeck,capCycle);capDeck=nd;capCycle=ncy;newAlexH=[...newAlexH,nc];}
      if(a.type==="attack"){const t2=(a.target&&g[a.target]?.hp>0)?a.target:["e1","e2"].find(k=>g[k].hp>0);if(t2){const d=8;g[t2]={...g[t2],hp:cl(g[t2].hp-d,0,999)};doEvent(t2,d,`⚔ Союзник → ${en(t2)} −${d} HP`,'#40c0ff');logs.push(`Союзник ⚔️→${en(t2)}: −${d}`);}}
      else if(a.type==="shield"){if(g.alex.hp>0){g.alex={...g.alex,hp:cl(g.alex.hp+10,0,g.alex.maxHp)};doEvent("alex",10,"🛡 Союзник: Щит → +10 HP",'#60d080',true);logs.push("Союзник 🛡️: +10HP");}}
      else if(a.type==="heal"){g.you={...g.you,hp:cl(g.you.hp+12,0,g.you.maxHp)};doEvent("you",12,"💉 Союзник: Исцелить → Ты +12 HP",'#60d080',true);logs.push("Союзник 💉→тебя: +12HP");}
    }
    {const fd=fpCycle(capCycle);if(fd>0&&g.alex.hp>0){g.alex={...g.alex,hp:cl(g.alex.hp-fd,0,g.alex.maxHp)};doEvent("alex",fd,`😓 Изнурение → Союзник −${fd} HP`,'#ff9040');logs.push(`Союзник 😓 изнурение: −${fd}HP`);}}
    const prevHpSk={you:g.you.hp,alex:g.alex.hp,e1:g.e1.hp,e2:g.e2.hp};
    setThinking({e1:g.e1.hp>0,e2:g.e2.hp>0,alex:false});
    await dly(1000+rnd(9000));
    setThinking({e1:false,e2:false,alex:false});
    const{ng,hits:eh,e1Card,e2Card,newE1h,newE2h,deck:eDeck,cycle:eCycle}=enemyAct(g,logs,turn,e1Hand,e2Hand,capDeck,capCycle);
    capDeck=eDeck;capCycle=eCycle;
    setEnemyCard({e1:e1Card,e2:null});setTimeout(()=>setEnemyCard({e1:null,e2:e2Card??null}),1750);setTimeout(()=>setEnemyCard({e1:null,e2:null}),3500);g=ng;
    for(const[k,d]of Object.entries(eh)){doEvent(k,d,`⚔ ${k==="you"?"Враг → Ты":k==="alex"?"Враг → Союзник":en(k)+" получил урон"} −${d} HP`,'#ff9040');}
    for(const k of["e1","e2","you","alex"]){if(ng[k].hp<=0&&prevHpSk[k]>0)enqueue(async()=>{showBanner(`💀 ${k==="you"?"Ты пал":k==="alex"?"Союзник пал":en(k)+" повержен"}`,'#ffffff');await dly(600);});}
    setGs(g);addLog(`── Ход ${turn} завершён ──`);logs.forEach(addLog);
    setE1Hand(newE1h);setE2Hand(newE2h);setAlexHand(newAlexH);
    // Draw 1 card for player at end of skip turn
    {const{cards:[drawn],deck:d3,cycle:c3}=drawFromDeck(1,capDeck,capCycle);
    capDeck=d3;capCycle=c3;
    if(hand.length>=5){setPendingDrawCard(drawn);}
    else{setHand(h=>[...h,drawn]);setTimeout(()=>setHand(h=>h.map(c=>({...c,flipIn:false}))),700);}
    setSharedDeck(capDeck);setFatigueCycle(capCycle);}
    setDrawCooldown(0);setTradeUsed(false);
    if(g.e1.hp<=0&&g.e2.hp<=0){setWinner("player");setPhase("over");setTimeout(()=>alexSpeak("victory",g),300);}
    else if(g.you.hp<=0&&g.alex.hp<=0){setWinner("enemy");setPhase("over");setTimeout(()=>alexSpeak("defeat",g),300);}
    else if(g.alex.hp<=0){setTimeout(()=>alexSpeak("ally_down",g),300);setTurn(t=>t+1);setOd(cl(2+nb-drawCooldown,1,4));setOdBank(0);setPhase(pendingDrawCard?"overflow":"player");}
    else{setTurn(t=>t+1);setOd(cl(2+nb-drawCooldown,1,4));setOdBank(0);setPhase(pendingDrawCard?"overflow":"player");}
    {const trim=(s,p)=>s&&s.startsWith(p)?s.slice(p.length).trim():s;
    setLastActions({
      e1:trim(logs.filter(l=>l.startsWith(en("e1"))||l.startsWith("💥 ВРАГИ")).slice(-1)[0]??"",en("e1")),
      e2:trim(logs.filter(l=>l.startsWith(en("e2"))).slice(-1)[0]??"",en("e2")),
      alex:trim(logs.filter(l=>l.startsWith("Союзник")).slice(-1)[0]??"","Союзник"),
    });}
    setLoad(false);
  };

  /* ── End turn ───────────────────────────────────────────────────────── */
  const endTurn=async()=>{
    if(phase!=="player"||loading||(played.length===0&&!jointCard))return;
    setPhase("busy");setLoad(true);
    if(isMobile){setActiveTab("battle");activeTabRef.current="battle";}
    let capturedDeck=[...sharedDeck];let capturedCycle=fatigueCycle;
    let localE1h=[...e1Hand];let localE2h=[...e2Hand];
    let g={you:{...gs.you},alex:{...gs.alex},e1:{...gs.e1},e2:{...gs.e2}};
    const logs=[];let nob=odBank;
    // Fatigue damage per card played
    const fatiguePerCard=fpCycle(capturedCycle);
    const fatigueDmg=fatiguePerCard*(played.length+(jointCard?1:0));
    if(fatigueDmg>0){g.you={...g.you,hp:cl(g.you.hp-fatigueDmg,0,g.you.maxHp)};doFlash("you",fatigueDmg);logs.push(`😓 Изнурение (цикл ${capturedCycle}): −${fatigueDmg}HP`);}

    const pereborDrawn=[];
    const combo=detectCombo(played);let cr=null;
    if(combo){
      const tgts=played.filter(p=>CARDS[p.card.type].t==="enemy");
      const ct=tgts.length>0?tgts[0].target:["e1","e2"].find(k=>g[k].hp>0);
      cr=combo.bonus(g,ct);logs.push(combo.msg);
      setComboGlow(combo.name);setTimeout(()=>setComboGlow(null),5000);
    }
    const stolenCards=[];
    for(const{card,target}of played){
      switch(card.type){
        case"attack":{const d=8;if(g[target]?.counter){g[target]={...g[target],counter:false};g.you={...g.you,hp:cl(g.you.hp-d,0,g.you.maxHp)};doEvent("you",d,`↩️ ${en(target)} Контр! −${d} HP тебе`,'#ff9040');logs.push(`↩️ ${en(target)} Контр → ты −${d}`);}else{g[target]={...g[target],hp:cl(g[target].hp-d,0,999)};doEvent(target,d,`⚔ Атака → ${en(target)} −${d} HP`,'#ff6060');logs.push(`Ты ⚔️→${en(target)}: −${d}`);}break;}
        case"shield":{g.you={...g.you,hp:cl(g.you.hp+10,0,g.you.maxHp)};doEvent("you",10,"💚 Щит → +10 HP",'#60d080',true);logs.push("Ты 🛡️: +10HP");break;}
        case"healAlex":{if(g.alex.hp>0){g.alex={...g.alex,hp:cl(g.alex.hp+12,0,g.alex.maxHp)};doEvent("alex",12,"💚 Исцелить → Союзник +12 HP",'#60d080',true);logs.push("Ты 💉→Союзник: +12HP");}break;}
        case"poison":{if(g[target].hp>0){g[target]={...g[target],poison:3};showBanner(`☠ Яд → ${en(target)}`,'#c060ff');logs.push(`Ты ☠️→${en(target)}: яд`);}break;}
        case"bleed":{if(g[target].hp>0){g[target]={...g[target],bleed:Math.min((g[target].bleed??0)+4,8)};showBanner(`🩸 Кровотечение → ${en(target)}`,'#e04040');logs.push(`Ты 🩸→${en(target)}: кровотечение ×4`);}break;}
        case"rage":{const d=18;if(g[target]?.counter){g[target]={...g[target],counter:false};g.you={...g.you,hp:cl(g.you.hp-d,0,g.you.maxHp)};doEvent("you",d,`↩️ ${en(target)} Контр! −${d} HP тебе`,'#ff9040');logs.push(`↩️ ${en(target)} Контр → ты −${d} (ярость)`);}else{g[target]={...g[target],hp:cl(g[target].hp-d,0,999)};doEvent(target,d,`🔥 Ярость → ${en(target)} −${d} HP`,'#ff6060');logs.push(`Ты 🔥→${en(target)}: −${d} (−4HP себе)`);}g.you={...g.you,hp:cl(g.you.hp-4,0,g.you.maxHp)};doEvent("you",4,"🔥 Отдача −4 HP",'#ff9040');break;}
        case"energy":{nob=2;showBanner("⚡ Энергия → +2 ОД на следующий ход",'#e8d090');logs.push("Ты ⚡: +2 ОД на след. ход");break;}
        case"trap":{g.you={...g.you,trap:true};showBanner("🪤 Ловушка установлена",'#e8d090');logs.push("Ты 🪤: Ловушка установлена");break;}
        case"counter":{g.you={...g.you,counter:true};showBanner("↩️ Контрудар готов",'#e8d090');logs.push("Ты ↩️: Контрудар готов");break;}
        case"double":{const d=8;const ot=["e1","e2"].find(k=>k!==target&&g[k].hp>0)??target;if(g[target].hp>0){g[target]={...g[target],hp:cl(g[target].hp-d,0,999)};doEvent(target,d,`⚔⚔ Двойной → ${en(target)} −${d} HP`,'#ff6060');}if(ot!==target&&g[ot].hp>0){g[ot]={...g[ot],hp:cl(g[ot].hp-d,0,999)};doEvent(ot,d,`⚔⚔ Двойной → ${en(ot)} −${d} HP`,'#ff6060');}logs.push(`Ты ⚔️⚔️→${en(target)}+${en(ot)}: −${d} каждому`);break;}
        case"revive":{if(g.alex.hp<=0){g.alex={...g.alex,hp:30};logs.push("✨ Союзник возрождён (30HP)!");setReviveAnim(true);setTimeout(()=>setReviveAnim(false),1500);setTimeout(()=>alexSpeak("revived",g),600);}break;}
        case"spy":{
          const sHand=target==="e1"?localE1h:localE2h;
          if(sHand.length>0){
            const si=rnd(sHand.length);const st=sHand[si];const rest=sHand.filter((_,i)=>i!==si);
            if(target==="e1")localE1h=rest;else localE2h=rest;
            stolenCards.push({uid:nuid(),type:st,flipIn:true});
            logs.push(`🔍 Шпионаж: украдена карта ${CARDS[st]?.e??""} ${CARDS[st]?.n??""} у ${en(target)}`);
          }else{logs.push(`🔍 Шпионаж: у ${en(target)} нет карт`);}
          break;}
        case"perebor":{
          const{cards:extra,deck:pd,cycle:pc}=drawFromDeck(2,capturedDeck,capturedCycle);
          capturedDeck=pd;capturedCycle=pc;
          pereborDrawn.push(...extra);
          logs.push("🃏 Перебор: +2 карты в руку");
          break;}
        case"jcounter":{
          g.you={...g.you,jcounter:target};
          showBanner("🔰 Контрудар готов (против совм. удара)","#22d3ee");
          logs.push(`Ты 🔰: Контрудар готов → ${en(target)}`);
          break;}
      }
    }
    if(cr){
      if(cr.self){g.you={...g.you,hp:cl(g.you.hp+cr.hp,0,g.you.maxHp)};g.alex={...g.alex,hp:cl(g.alex.hp+cr.hp,0,g.alex.maxHp)};doEvent("you",cr.hp,`✨ Комбо → Ты +${cr.hp} HP`,'#60d080',true);doEvent("alex",cr.hp,`✨ Комбо → Союзник +${cr.hp} HP`,'#60d080',true);logs.push(`Комбо: команда +${cr.hp}HP`);}
      else if(cr.tgt&&g[cr.tgt].hp>0){g[cr.tgt]={...g[cr.tgt],hp:cl(g[cr.tgt].hp-cr.hp,0,999),poison:cr.poison??g[cr.tgt].poison};doEvent(cr.tgt,cr.hp,`✨ Комбо → ${en(cr.tgt)} −${cr.hp} HP`,'#f0c040');logs.push(`Комбо: ${en(cr.tgt)} −${cr.hp}HP${cr.poison?` + яд×${cr.poison}`:""}`);}
      enqueue(async()=>{showComboBanner(combo.name);await dly(400);});
    }
    // Only remove joint card if Alex agreed; otherwise keep it in hand
    let newHand=hand.filter(c=>!played.find(p=>p.card.uid===c.uid));
    if(jointCard&&jointReady){newHand=newHand.filter(c=>c.uid!==jointCard.uid);}
    newHand=[...newHand,...stolenCards,...pereborDrawn];
    setHand(newHand);setTimeout(()=>setHand(h=>h.map(c=>({...c,flipIn:false}))),700);
    setPlayed([]);
    if(jointCard&&jointTarget&&jointReady){const d=22;if(g[jointTarget].hp>0){g[jointTarget]={...g[jointTarget],hp:cl(g[jointTarget].hp-d,0,999)};doEvent(jointTarget,d,`💥 Совместный удар → ${en(jointTarget)} −${d} HP`,'#ff6060');enqueue(async()=>{showComboBanner("💥 СОВМЕСТНЫЙ УДАР",JOINT_IMG);await dly(400);});logs.push(`💥 СОВМЕСТНЫЙ УДАР → ${en(jointTarget)}: −${d}!`);setCoopScore(s=>s+2);}}
    else if(jointCard&&!jointReady)logs.push("💥 Союзник не готов — удар сорвался");
    setJC(null);setJR(false);setJointTarget(null);
    const allyLow=g.alex.hp<MHP.alex*0.35||g.you.hp<MHP.you*0.35;
    if(Math.random()<0.25){setThinking(t=>({...t,alex:true}));await dly(1500+rnd(1500));setThinking(t=>({...t,alex:false}));}
    const ar=await alexTurnAPI(g,"",allyLow);
    if(ar.message&&ar.message.trim()&&ar.message!==SKIP)addChat("alex",ar.message);
    let newAlexH=[...alexHand];
    const alexActionType=ar.actions?.[0]?.type??"";
    for(const a of(ar.actions??[]).slice(0,1)){
      const pool=ALEX_ACTION_MAP[a.type]??["attack"];
      const usedIdx=newAlexH.findIndex(t=>pool.includes(t));
      if(usedIdx>=0){newAlexH=newAlexH.filter((_,i)=>i!==usedIdx);const{types:[nc],deck:nd,cycle:ncy}=drawRaw(1,capturedDeck,capturedCycle);capturedDeck=nd;capturedCycle=ncy;newAlexH=[...newAlexH,nc];}
      const st=targ=>{if(targ&&g[targ]?.hp>0)return targ;return["e1","e2"].find(k=>g[k].hp>0)??null;};
      if(a.type==="attack"){const t2=st(a.target);if(t2){const d=8;g[t2]={...g[t2],hp:cl(g[t2].hp-d,0,999)};doEvent(t2,d,`⚔ Союзник → ${en(t2)} −${d} HP`,'#40c0ff');logs.push(`Союзник ⚔️→${en(t2)}: −${d}`);}}
      else if(a.type==="shield"){if(g.alex.hp>0){g.alex={...g.alex,hp:cl(g.alex.hp+10,0,g.alex.maxHp)};doEvent("alex",10,"🛡 Союзник: Щит → +10 HP",'#60d080',true);logs.push("Союзник 🛡️: +10HP");}}
      else if(a.type==="heal"){g.you={...g.you,hp:cl(g.you.hp+12,0,g.you.maxHp)};doEvent("you",12,"💉 Союзник: Исцелить → Ты +12 HP",'#60d080',true);logs.push("Союзник 💉→тебя: +12HP");}
    }
    // Alex-player joint combos
    {const playerTypes=played.map(p=>p.card.type);let jcFired=false;
    if(playerTypes.includes("shield")&&alexActionType==="shield"){
      g.you={...g.you,hp:cl(g.you.hp+10,0,g.you.maxHp)};g.alex={...g.alex,hp:cl(g.alex.hp+10,0,g.alex.maxHp)};
      doEvent("you",10,"🛡🛡 Стена щитов → Ты +10 HP",'#60d080',true);
      logs.push("🛡️🛡️ СТЕНА ЩИТОВ: команда +10HP!");setCoopScore(s=>s+1);jcFired=true;
    }else if((playerTypes.includes("attack")||playerTypes.includes("rage"))&&alexActionType==="attack"){
      const t3=played.find(p=>p.card.type==="attack"||p.card.type==="rage")?.target??["e1","e2"].find(k=>g[k].hp>0);
      if(t3&&g[t3]?.hp>0){g[t3]={...g[t3],hp:cl(g[t3].hp-12,0,999)};doEvent(t3,12,`⚔⚔ Двойной натиск → ${en(t3)} −12 HP`,'#ff6060');logs.push(`⚔️⚔️ ДВОЙНОЙ НАТИСК: ${en(t3)} −12 доп.!`);setCoopScore(s=>s+1);jcFired=true;}
    }else if(playerTypes.includes("joint")&&jointReady&&alexActionType==="attack"){
      const t3=jointTarget??["e1","e2"].find(k=>g[k].hp>0);
      if(t3&&g[t3]?.hp>0){g[t3]={...g[t3],hp:cl(g[t3].hp-8,0,999)};doEvent(t3,8,`💥⚔ Живая цепь → ${en(t3)} −8 HP`,'#ff6060');logs.push(`💥⚔️ ЖИВАЯ ЦЕПЬ: ${en(t3)} −8 доп.!`);setCoopScore(s=>s+1);jcFired=true;}
    }
    if(jcFired)setTimeout(()=>alexSpeak("joint_combo",g),400);}
    {const fd=fpCycle(capturedCycle);if(fd>0&&g.alex.hp>0){g.alex={...g.alex,hp:cl(g.alex.hp-fd,0,g.alex.maxHp)};doEvent("alex",fd,`😓 Изнурение → Союзник −${fd} HP`,'#ff9040');logs.push(`Союзник 😓 изнурение: −${fd}HP`);}}
    const prevHp={you:g.you.hp,alex:g.alex.hp,e1:g.e1.hp,e2:g.e2.hp};
    setThinking({e1:g.e1.hp>0,e2:g.e2.hp>0,alex:false});
    await dly(1000+rnd(9000));
    setThinking({e1:false,e2:false,alex:false});
    const{ng,hits:eh,e1Card,e2Card,newE1h,newE2h,deck:eDeck,cycle:eCycle}=enemyAct(g,logs,turn,localE1h,localE2h,capturedDeck,capturedCycle);
    capturedDeck=eDeck;capturedCycle=eCycle;
    setEnemyCard({e1:e1Card,e2:null});setTimeout(()=>setEnemyCard({e1:null,e2:e2Card??null}),1750);setTimeout(()=>setEnemyCard({e1:null,e2:null}),3500);g=ng;
    for(const[k,d]of Object.entries(eh)){const isEnemy=k==="e1"||k==="e2";doEvent(k,d,isEnemy?`⚔ Враги → ${en(k)} −${d} HP`:`⚔ Враги → ${k==="you"?"Ты":"Союзник"} −${d} HP`,'#ff9040');}
    for(const k of["e1","e2","you","alex"]){if(ng[k].hp<=0&&prevHp[k]>0)enqueue(async()=>{showBanner(`💀 ${k==="you"?"Ты пал":k==="alex"?"Союзник пал":en(k)+" повержен"}`,'#ffffff');await dly(600);});}
    setGs(g);addLog(`── Ход ${turn} завершён ──`);logs.forEach(addLog);
    setOd(cl(2+nob-drawCooldown,1,4));setOdBank(0);setDrawCooldown(0);
    setE1Hand(newE1h);setE2Hand(newE2h);setAlexHand(newAlexH);
    // Situational alexSpeak (non-blocking, 15% chance to avoid every-turn spam)
    if(Math.random()<0.15){
      const enemyLow=["e1","e2"].some(k=>g[k].hp>0&&g[k].hp<MHP[k]*0.3);
      const heavyHit=(eh.you??0)>=15;
      if(heavyHit)setTimeout(()=>alexSpeak("took_heavy_hit",g),500);
      else if(g.you.hp<MHP.you*0.25||g.alex.hp<MHP.alex*0.25)setTimeout(()=>alexSpeak("low_hp",g),500);
      else if(enemyLow)setTimeout(()=>alexSpeak("enemy_low_hp",g),500);
    }
    // Alex proactively suggests joint strike (20% chance if has joint card and enemies alive)
    {const aliveAfter=["e1","e2"].filter(k=>g[k].hp>0);
    if(newAlexH.includes("joint")&&aliveAfter.length>0&&Math.random()<0.08&&!tradeOffer){
      const weakestE=aliveAfter.reduce((a,b)=>g[a].hp<=g[b].hp?a:b);
      setTimeout(async()=>{
        if(!allyPersona)return;
        const ctx={allyHp:g.alex.hp,youHp:g.you.hp,enemies:aliveAfter.map(k=>`${en(k)} ${g[k].hp}HP`).join(", ")};
        const hint=`У тебя есть карта Совместного удара. Предложи партнёру ударить вместе по ${en(weakestE)} (${g[weakestE].hp} здоровья). Коротко, в своей манере.`;
        const msg=await llmChat(allyPersona.getSystemPrompt(allyNick),hint,"слушай, давай совм. удар по нему?",chat.slice(-2));
        addChat("alex",msg);
      },1200);
    }}
    // Trade offer (12% chance) — Alex prefers to trade away low-value cards, only if alive
    if(newAlexH.length>0&&!tradeOffer&&ng.alex.hp>0&&Math.random()<0.12){
      const lowValueCards=["energy","spy","perebor"];
      const preferredOffer=newAlexH.findIndex(t=>lowValueCards.includes(t));
      const oi=preferredOffer>=0?preferredOffer:rnd(newAlexH.length);
      setTradeOffer({type:newAlexH[oi],idx:oi});
      setTimeout(()=>alexSpeak("trade_offer",g),800);
    }
    // Draw 1 card for player at end of turn
    {const curHand=hand.filter(c=>!played.find(p=>p.card.uid===c.uid)).filter(c=>c.uid!==(jointCard?.uid));
    const{cards:[drawn],deck:d3,cycle:c3}=drawFromDeck(1,capturedDeck,capturedCycle);
    capturedDeck=d3;capturedCycle=c3;
    if(curHand.length>=5){setPendingDrawCard(drawn);}
    else{setHand(h=>[...h.filter(c=>!played.find(p=>p.card.uid===c.uid)).filter(c=>c.uid!==(jointCard?.uid)),drawn]);setTimeout(()=>setHand(h=>h.map(c=>({...c,flipIn:false}))),700);}
    setSharedDeck(capturedDeck);setFatigueCycle(capturedCycle);}
    if(g.e1.hp<=0&&g.e2.hp<=0){setWinner("player");setPhase("over");setTimeout(()=>alexSpeak("victory",g),300);}
    else if(g.you.hp<=0&&g.alex.hp<=0){setWinner("enemy");setPhase("over");setTimeout(()=>alexSpeak("defeat",g),300);}
    else if(g.alex.hp<=0){setTimeout(()=>alexSpeak("ally_down",g),300);setTurn(t=>t+1);setTradeUsed(false);setPhase(pendingDrawCard?"overflow":"player");}
    else{setTurn(t=>t+1);setTradeUsed(false);setPhase(pendingDrawCard?"overflow":"player");}
    {const trim=(s,p)=>s&&s.startsWith(p)?s.slice(p.length).trim():s;
    setLastActions({
      e1:trim(logs.filter(l=>l.startsWith(en("e1"))||l.startsWith("💥 ВРАГИ")).slice(-1)[0]??"",en("e1")),
      e2:trim(logs.filter(l=>l.startsWith(en("e2"))).slice(-1)[0]??"",en("e2")),
      alex:trim(logs.filter(l=>l.startsWith("Союзник")).slice(-1)[0]??"","Союзник"),
    });}
    setLoad(false);
  };

  /* ── Alex turn action — strategic decision + DeepSeek message ───────── */
  const alexTurnAPI=async(g,_lm,allyLow)=>{
    // Dead ally does nothing
    if(g.alex.hp<=0)return{message:"",actions:[]};
    const alive=["e1","e2"].filter(k=>g[k].hp>0);
    const weakest=alive.length>0?alive.reduce((a,b)=>g[a].hp<=g[b].hp?a:b):null;
    const hasCard=types=>types.some(t=>alexHand.includes(t));
    // Priority decision with hand awareness
    let actionType="attack",actionTarget=weakest??"e1";
    if(g.alex.hp<25&&hasCard(["shield","counter","trap"])){actionType="shield";}
    else if(g.you.hp<28&&g.alex.hp>35&&hasCard(["healAlex","revive","energy"])){actionType="heal";}
    else if(g.alex.hp<50&&Math.random()<0.35&&hasCard(["shield","counter","trap"])){actionType="shield";}
    else if(g.you.hp<55&&g.alex.hp>40&&Math.random()<0.25&&hasCard(["healAlex","revive","energy"])){actionType="heal";}
    else if(weakest){actionType="attack";actionTarget=weakest;}
    else{actionType="shield";}
    // 60% chance to stay silent — not every action needs commentary
    if(Math.random()<0.6){
      return{message:"",actions:[{type:actionType,target:actionTarget}]};
    }
    // Generate short situational message via LLM
    const persona=allyPersona;
    const nick=allyNick;
    const ctx={allyHp:g.alex.hp,youHp:g.you.hp,enemies:alive.map(k=>`${en(k)} ${g[k].hp}HP`).join(", ")||"повержены"};
    const actionHint=actionType==="attack"
      ?`Атакуешь ${weakest?en(weakest):"врага"} (${g[weakest??'e1']?.hp??0} здоровья). 1 короткая реплика как живой игрок.`
      :actionType==="heal"?"Лечишь союзника. 1 короткая реплика как живой игрок."
      :"Ставишь защиту. 1 короткая реплика как живой игрок.";
    const raw=persona?await llmChat(persona.getSystemPrompt(nick),actionHint,null,chat.slice(-2)):null;
    const message=(raw&&raw!==SKIP)?raw:"";
    return{message,actions:[{type:actionType,target:actionTarget}]};
  };
  const alexChatAPI=async(msg,g)=>{
    if(!allyPersona)return"Понял.";
    const aliveEnemies=["e1","e2"].filter(k=>g?.[k]?.hp>0).map(k=>`${en(k)} ${g[k].hp}/100HP`);
    const deadEnemies=["e1","e2"].filter(k=>g?.[k]?.hp<=0).map(k=>en(k));
    const allyHp=g?.alex?.hp??"?";
    const youHp=g?.you?.hp??"?";
    const handDesc=alexHand.length
      ?alexHand.map(t=>`«${CARDS[t]?.n??t}»(${CARDS[t]?.od??1}ОД)`).join(", ")
      :"карт нет";
    const statusLines=[
      `Идёт бой «Дружина» — 2 против 2. Ход ${turn}.`,
      `Твоё здоровье: ${allyHp}/100. Партнёр (${localStorage.getItem("nick_self")||"ты"}): ${youHp}/100.`,
      aliveEnemies.length?`Живые враги: ${aliveEnemies.join(", ")}.`:`Все враги повержены.`,
      deadEnemies.length?`Пали: ${deadEnemies.join(", ")}.`:"",
      `Твои карты: ${handDesc}.`,
    ].filter(Boolean).join(" ");
    const base=allyPersona.getSystemPrompt(allyNick);
    const sys=`${base}\n\nТЕКУЩЕЕ СОСТОЯНИЕ БОЯ: ${statusLines}`;
    return llmChat(sys,msg,"ок",chat.slice(-4));
  };
  const sendChat=async()=>{
    const msg=input.trim();if(!msg||loading)return;
    addChat("you",msg);setInput("");setLoad(true);
    const r=await alexChatAPI(msg,gs);if(r!==SKIP)addChat("alex",r);setLoad(false);
  };
  const restart=()=>{
    const gi=createGameInit();
    setGs(initGs());setHand(gi.hand);setSharedDeck(gi.deck);setFatigueCycle(gi.fatigueCycle);
    setE1Hand(gi.e1Hand);setE2Hand(gi.e2Hand);setAlexHand(gi.alexHand);
    setPendingDrawCard(null);setMulliganMarked(new Set());
    setPlayed([]);setJC(null);setJR(false);setJointTarget(null);
    setPhase("mulligan");setWinner(null);setLog([]);
    setTurn(1);setLoad(false);setFlash({});setShake(null);setOd(2);setOdBank(0);
    setComboGlow(null);setPreview(null);
    setTyping(false);setTradeOffer(null);setTradeSel(null);setTradeUsed(false);setDrawCooldown(0);setCoopScore(0);
    setThinking({e1:false,e2:false,alex:false});setAnimating(false);
    animQueueRef.current=[];animPlayingRef.current=false;
    deathLoggedRef.current=false;
    setChat([{from:"alex",text:"норм, давай играть)"}]);
  };

  const isP=phase==="player"&&!loading&&!animating&&gs.you.hp>0;
  const canEnd=isP&&(played.length>0||!!jointCard);
  const combo=detectCombo(played);
  const comboTypes=combo?played.map(p=>p.card.type):[];
  const previewAlreadySel=preview&&(
    !!played.find(p=>p.card.uid===preview.uid)||
    jointCard?.uid===preview.uid
  );
  const previewOdLeft=previewAlreadySel?odLeft+(preview?CARDS[preview.type].od:0):odLeft;

  return(
    <div style={{fontFamily:"Georgia,serif",background:"#080604",minHeight:"100vh",
      color:"#c8b080",position:"relative",overflow:"hidden",isolation:"isolate"}}>
{/* Board bg */}
      <div style={{position:"absolute",inset:0,zIndex:0,
        backgroundImage:`url(${BG})`,backgroundSize:"cover",backgroundPosition:"center",opacity:0.55}}/>
      <div style={{position:"absolute",inset:0,zIndex:0,background:"linear-gradient(to bottom,rgba(4,3,2,0.62),rgba(6,4,2,0.58))"}}/>

      {/* Combo flash */}
      {comboGlow&&(
        <div style={{position:"fixed",inset:0,zIndex:58,
          display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",
          background:"rgba(0,0,0,0.65)",animation:"fadeIn 0.15s"}}>
          <div style={{position:"relative",animation:"comboFlash 2.5s cubic-bezier(.15,1.2,.3,1)"}}>
            <img src={getComboArt(comboGlow)} alt="" style={{width:"min(500px,90vw)",height:"auto",aspectRatio:"500/330",objectFit:"cover",
              borderRadius:16,border:"3px solid #e09a3c",
              boxShadow:"0 0 100px rgba(224,154,60,1),0 0 200px rgba(200,80,0,0.5)"}}/>
            <div style={{position:"absolute",inset:0,borderRadius:16,
              background:"linear-gradient(160deg,rgba(255,220,0,0.06),rgba(0,0,0,0.55))"}}/>
            <div style={{position:"absolute",top:"50%",left:"50%",
              transform:"translate(-50%,-50%)",
              fontSize:72,filter:"drop-shadow(0 0 40px rgba(255,210,0,1))",
              animation:"pulse 0.35s infinite"}}>⚡</div>
          </div>
        </div>)}

      {/* Enemy card animation */}
      <EnemyCardShow enemyCard={enemyCard} e1Nick={e1Nick} e2Nick={e2Nick}/>

      {/* Trap and counter animations */}
      <TrapAnimation trigger={trapTrigger}/>
      <CounterAnimation trigger={counterTrigger}/>

      {/* Preview overlay */}
      {preview&&<CardPreview card={preview} gs={gs} isP={isP}
        odLeft={previewOdLeft} alreadySel={previewAlreadySel}
        onApply={()=>handleApply(preview)}
        onTarget={t=>handleTarget(preview,t)}
        onClose={()=>setPreview(null)}
        en={en}/>}

      <div style={{position:"relative",zIndex:1,maxWidth:1100,margin:"0 auto",padding:isMobile?"8px 8px 72px":"10px 14px 6px"}}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          marginBottom:10,borderBottom:"1px solid rgba(200,160,80,0.2)",paddingBottom:8}}>
          <span style={{fontSize:20,fontWeight:900,letterSpacing:4,color:"#c8901c",
            fontFamily:"Georgia,serif",textShadow:"0 0 20px rgba(200,140,20,0.5)"}}>ДРУЖИНА</span>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
              <div style={{fontSize:11,letterSpacing:2,fontFamily:"Georgia,serif",
                minWidth:140,textAlign:"right",height:16,overflow:"hidden",
                color:phase==="player"?"#4caf82":phase==="busy"?"#e09a3c":"#e05252",
                animation:phase==="busy"?"pulse 1s infinite":undefined}}>
                {phase==="mulligan"?"🃏 РАЗДАЧА":phase==="player"?"▶ ТВОЙ ХОД":phase==="busy"?"⏳ ХОД ВРАГОВ...":phase==="overflow"?"🃏 РУКА ПОЛНА":"■ КОНЕЦ"}
              </div>
              <div style={{fontSize:9,color:"#4a3510",fontFamily:"Georgia,serif"}}>
                {phase==="player"?"Выбирай карты и завершай ход":phase==="busy"?"Союзник и враги делают ходы":phase==="mulligan"?"Можно заменить до 2 карт":phase==="overflow"?"Выбери карту для сброса":""}
              </div>
            </div>
            <button onClick={()=>{setShowTutorial(true);localStorage.removeItem("tutorialDone");}}
              style={{background:"rgba(200,160,80,0.08)",color:"#8a7040",
              border:"1px solid rgba(200,160,80,0.28)",borderRadius:5,padding:"5px 12px",
              fontSize:11,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:0.5}}>
              📖 Обучение
            </button>
          </div>
        </div>

        {/* ── Enemies row ──────────────────────────────────────────────────── */}
        <div data-tutorial="enemies" style={{display:isMobile&&activeTab!=="battle"?"none":"flex",gap:12,marginBottom:12}}>
          {[
            {key:"e1",name:en("e1"),bar:"#e05252",ring:"#e05252"},
            {key:"e2",name:en("e2"),bar:"#a03070",ring:"#a03070"},
          ].map(({key,name,bar,ring})=>{
            const g=gs[key];const isDead=g.hp<=0;
            return(
              <div key={key} data-entity={key} style={{flex:1,background:"linear-gradient(135deg,rgba(25,16,8,0.95),rgba(15,10,5,0.98))",
                border:`1px solid ${isDead?"rgba(255,255,255,0.04)":ring+"44"}`,
                borderRadius:10,padding:"10px 14px",position:"relative",
                animation:shaking===key?"shake 0.5s":flash[key]?"hitFlash 0.7s":undefined,
                boxShadow:isDead?"none":`0 2px 12px rgba(0,0,0,0.5)`,
                opacity:isDead?0.5:1,transition:"opacity 0.5s"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,
                    background:`radial-gradient(circle,${ring}44,rgba(0,0,0,0.7))`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:16,opacity:isDead?0.2:1,border:`2px solid ${ring}55`,overflow:"hidden"}}>
                    <AvatarImg src={gameAvatars?.[key==="e1"?"avatar_opponent_1":"avatar_opponent_2"]}
                      fallback={name.charAt(0)}
                      style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:"Georgia,serif",
                        color:isDead?"#333":"#d4c4a0",textDecoration:isDead?"line-through":"none"}}>
                        {name}</span>
                    </div>
                    <HpBar hp={g.hp} maxHp={MHP[key]} color={bar} flash={flash[key]}/>
                    <EffectBadges poison={g.poison} bleed={g.bleed}/>
                    {thinking[key]&&!isDead&&(
                      <div className="thinking-indicator" style={{marginTop:4}}>···</div>
                    )}
                    {lastActions[key]&&!isDead&&!lastActions[key].includes("изнурение")&&!thinking[key]&&(
                      <div style={{fontSize:9,color:"#5a4030",marginTop:4,fontFamily:"Georgia,serif",
                        fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {lastActions[key]}
                      </div>
                    )}
                  </div>
                </div>
                {!isDead&&<CardBackRow count={key==="e1"?e1Hand.length:e2Hand.length}/>}
                {isDead&&<div style={{position:"absolute",inset:0,borderRadius:10,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background:"rgba(0,0,0,0.4)",pointerEvents:"none",zIndex:3}}>
                  <span style={{fontSize:20,color:"#333"}}>☠</span>
                </div>}
              </div>
            );
          })}
        </div>

        {/* ── Middle: Alex+Log | Chat ──────────────────────────────────────── */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 340px",gap:12,marginBottom:10}}>
          <div style={{display:isMobile&&activeTab!=="battle"?"none":"flex",flexDirection:"column",gap:8}}>

            {/* Alex block */}
            <div data-tutorial="ally" data-entity="alex" style={{background:"linear-gradient(135deg,rgba(10,25,18,0.95),rgba(5,15,10,0.98))",
              border:`1px solid ${gs.alex.hp<=0?"rgba(255,255,255,0.04)":"rgba(76,175,130,0.35)"}`,
              borderRadius:10,padding:"10px 14px",position:"relative",
              animation:reviveAnim?"reviveGlow 1s":shaking==="alex"?"shake 0.5s":flash.alex?"hitFlash 0.7s":undefined,
              boxShadow:reviveAnim?"0 0 30px rgba(255,215,0,0.5)":gs.alex.hp<=0?"none":"0 2px 12px rgba(0,0,0,0.5)"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,
                  background:"radial-gradient(circle,rgba(76,175,130,0.3),rgba(0,0,0,0.7))",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,opacity:gs.alex.hp<=0?0.2:1,border:"2px solid rgba(76,175,130,0.4)",overflow:"hidden"}}>
                  <AvatarImg src={gameAvatars?.avatar_partner} fallback={allyNick.charAt(0)}
                    style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:700,fontFamily:"Georgia,serif",
                      color:gs.alex.hp<=0?"#333":"#d4c4a0"}}>{allyNick}</span>
                    <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,
                      background:gs.alex.hp<=0?"rgba(100,0,0,0.3)":"rgba(76,175,130,0.15)",
                      color:gs.alex.hp<=0?"#aa4444":"#4caf82",fontFamily:"Georgia,serif"}}>
                      {gs.alex.hp<=0?"павший":"жив"}</span>
                  </div>
                  <HpBar hp={gs.alex.hp} maxHp={MHP.alex} color="#4caf82" flash={flash.alex}/>
                  <EffectBadges poison={gs.alex.poison} bleed={gs.alex.bleed}/>
                  {thinking.alex&&gs.alex.hp>0&&(
                    <div className="thinking-indicator" style={{marginTop:4}}>···</div>
                  )}
                  {lastActions.alex&&!lastActions.alex.includes("изнурение")&&!thinking.alex&&(
                    <div style={{fontSize:9,color:"#2a5038",marginTop:4,fontFamily:"Georgia,serif",fontStyle:"italic"}}>
                      {lastActions.alex}</div>
                  )}
                </div>
                {/* Trade indicator / initiate button */}
                <div style={{marginLeft:"auto",flexShrink:0,display:"flex",alignItems:"center",gap:6}}>
                  {tradeOffer&&gs.alex.hp>0?(
                    <div style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",
                      borderRadius:7,border:"1px solid rgba(76,175,130,0.45)",
                      background:"rgba(76,175,130,0.12)",animation:"pulse 1.2s infinite"}}>
                      <span style={{fontSize:14}}>💱</span>
                      <span style={{fontSize:9,color:"#4caf82",fontFamily:"Georgia,serif"}}>обмен!</span>
                    </div>
                  ):isP&&!tradeUsed&&alexHand.length>0&&gs.alex.hp>0?(
                    <button onClick={()=>{
                      const idx=rnd(alexHand.length);
                      setTradeOffer({type:alexHand[idx],idx});
                      setTradeUsed(true);
                      alexSpeak("trade_offer",gs);
                    }} style={{background:"rgba(80,140,80,0.25)",color:"#90d090",
                      border:"2px solid #60a060",borderRadius:6,
                      padding:"6px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
                      letterSpacing:0.3}}>
                      💱 обмен
                    </button>
                  ):null}
                </div>
              </div>
              {gs.alex.hp>0&&<CardBackRow count={alexHand.length}/>}
              {gs.alex.hp<=0&&<div style={{position:"absolute",inset:0,borderRadius:10,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:"rgba(0,0,0,0.5)",pointerEvents:"none"}}>
                <span style={{fontSize:14,color:"#664444",fontFamily:"Georgia,serif",letterSpacing:2}}>ПАВШИЙ</span>
              </div>}
            </div>

            {/* Combo bar */}
            {combo&&<div style={{padding:"7px 14px",background:"rgba(200,154,60,0.12)",
              border:"1.5px solid rgba(200,154,60,0.45)",borderRadius:8,
              animation:"comboPulse 0.8s infinite",fontSize:12,color:"#e09a3c",
              fontFamily:"Georgia,serif",fontWeight:700}}>⚡ КОМБО: {combo.name}</div>}

            {/* Log */}
            <div style={{background:"rgba(0,0,0,0.5)",border:"1px solid rgba(200,160,80,0.1)",
              borderRadius:8,padding:"8px 10px",flexShrink:0}}>
              <div style={{fontSize:9,letterSpacing:2,color:"#4a3010",marginBottom:5,fontFamily:"Georgia,serif"}}>ЛОГ БИТВЫ</div>
              <div style={{maxHeight:300,overflowY:"auto",paddingRight:4,minHeight:120}}>
                {log.length===0?<div style={{fontSize:11,color:"#2a2010",fontFamily:"Georgia,serif"}}>— бой начинается —</div>
                  :log.slice(-60).map((l,i)=><LogLine key={i} text={l} e1Nick={e1Nick} e2Nick={e2Nick} allyNick={allyNick}/>)}
                <div ref={logEnd}/>
              </div>
            </div>

            {/* Joint / spy status */}
            {jointCard&&(
              <div style={{padding:"10px 12px",background:"rgba(200,154,60,0.08)",border:"1.5px solid rgba(200,154,60,0.35)",borderRadius:10,animation:"fadeIn 0.2s"}}>
                <div style={{fontSize:11,color:"#e09a3c",fontFamily:"Georgia,serif",marginBottom:3}}>
                  💥 СОВМЕСТНЫЙ УДАР {jointTarget?`→ ${en(jointTarget)}`:""}</div>
                {loading&&!jointReady&&<div style={{fontSize:10,color:"#888",animation:"pulse 1s infinite"}}>⏳ Спрашиваю Союзника…</div>}
                {jointReady&&<div style={{fontSize:11,color:"#4caf82",fontFamily:"Georgia,serif"}}>✓ Готов — завершай ход</div>}
                {!loading&&!jointReady&&jointTarget&&<div style={{fontSize:11,color:"#e05252",fontFamily:"Georgia,serif"}}>✗ Союзник не готов</div>}
              </div>)}
          </div>

          {/* Chat */}
          <div style={{background:"rgba(0,0,0,0.6)",border:"1px solid rgba(200,160,80,0.15)",
            borderRadius:10,padding:14,display:isMobile&&activeTab!=="chat"?"none":"flex",flexDirection:"column",
            ...(isMobile?{minHeight:"calc(100vh - 120px)",maxHeight:"calc(100vh - 120px)"}:{})}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#2a7048,#4caf82)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700,fontFamily:"Georgia,serif",overflow:"hidden"}}>
                <AvatarImg src={gameAvatars?.avatar_partner} fallback={allyNick.charAt(0)}
                  style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              </div>
              <div style={{fontSize:10,letterSpacing:2,color:"#2a4030",fontFamily:"Georgia,serif"}}>{`ЧАТ — ${allyNick.toUpperCase()}`}</div>
              {thinking.alex&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:"#4caf82",animation:"pulse 1s infinite"}}/>
                <span style={{fontSize:8,color:"#4caf82",fontFamily:"Georgia,serif"}}>думает...</span>
              </div>}
              {!thinking.alex&&loading&&<div style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:"#4caf82",animation:"pulse 1s infinite"}}/>}
            </div>
            <div style={{flex:1,overflowY:"auto",marginBottom:10,minHeight:120,maxHeight:isMobile?"calc(100vh - 260px)":280}}>
              {chat.slice(-50).map((m,i)=><Bubble key={i} m={m} nick={allyNick}/>)}
              {typing&&(
                <div style={{marginBottom:10,display:"flex",gap:7,alignItems:"flex-start",animation:"fadeIn 0.25s"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"#4caf82",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
                    color:"#fff",fontWeight:700,flexShrink:0,fontFamily:"Georgia,serif"}}>{allyNick.charAt(0).toUpperCase()}</div>
                  <div style={{fontSize:18,color:"#4caf82",background:"rgba(76,175,130,0.1)",
                    padding:"6px 14px",borderRadius:8,border:"1px solid rgba(76,175,130,0.25)",
                    animation:"pulse 0.8s infinite",letterSpacing:4}}>···</div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
              {[["🛡 Прикрой","Прикрой меня!"],["⚔ Бей!",`Бей ${en("e1")}!`],
                ["💉 Лечи","Исцели меня!"],["💥 Совм.","Совместный удар?"],
                ["📖 Комбо?","Какие комбо нам доступны?"]].map(([label,msg])=>(
                <button key={label} onClick={()=>{if(!loading){addChat("you",msg);setInput("");setLoad(true);alexChatAPI(msg,gs).then(r=>{if(r!==SKIP)addChat("alex",r);setLoad(false);});}}}
                  disabled={loading} style={{background:"rgba(200,160,80,0.06)",border:"1px solid rgba(200,160,80,0.2)",
                  borderRadius:6,padding:isMobile?"8px 12px":"5px 9px",color:loading?"#2a1808":"#8a7050",
                  fontSize:isMobile?13:10,cursor:loading?"default":"pointer",fontFamily:"Georgia,serif"}}>{label}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder={`Написать ${allyNick}…`} disabled={loading}
                style={{flex:1,padding:"8px 10px",background:"rgba(200,160,80,0.06)",
                  border:"1px solid rgba(200,160,80,0.2)",borderRadius:6,
                  fontSize:12,color:"#c8b080",outline:"none",fontFamily:"Georgia,serif"}}/>
              <button onClick={sendChat} disabled={loading||!input.trim()} aria-label="Отправить" style={{
                background:!loading&&input.trim()?"linear-gradient(135deg,#7a4008,#b86018)":"rgba(255,255,255,0.04)",
                color:!loading&&input.trim()?"#fff":"#2a1808",
                border:"none",borderRadius:6,padding:"8px 14px",cursor:"pointer",fontSize:14}}>→</button>
            </div>
          </div>
        </div>

        {/* ── Played cards summary — visible on battle tab on mobile ─────────── */}
        {isMobile&&activeTab==="battle"&&played.length>0&&(
          <div style={{background:"rgba(200,154,60,0.06)",borderRadius:8,border:"1px solid rgba(200,154,60,0.2)",
            padding:"6px 10px",marginBottom:8,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:9,color:"#8a6020",fontFamily:"Georgia,serif"}}>В ход:</span>
            {played.map((p)=>{
              const def=CARDS[p.card.type];
              return <div key={p.card.uid} style={{fontSize:9,background:"rgba(200,154,60,0.15)",
                border:`1px solid ${def.c}55`,borderRadius:5,padding:"3px 8px",
                color:def.c,fontFamily:"Georgia,serif"}}>
                {def.e} {def.n}{p.target?` →${en(p.target)}`:""}
              </div>;
            })}
            {combo&&<div style={{fontSize:9,background:"rgba(224,154,60,0.2)",
              border:"1px solid rgba(224,154,60,0.5)",borderRadius:5,padding:"3px 8px",
              color:"#e09a3c",fontFamily:"Georgia,serif",fontWeight:700}}>✨ {combo.name}</div>}
          </div>
        )}

        {/* ── Hand area ──────────────────────────────────────────────────────── */}
        <div data-tutorial="hand" style={{display:isMobile&&activeTab!=="cards"?"none":"block",background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,160,80,0.12)",
          borderRadius:10,padding:"10px 14px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontSize:9,letterSpacing:2,color:"#4a3010",fontFamily:"Georgia,serif"}}>РУКА</div>
              <button onClick={()=>setShowComboRef(v=>!v)}
                style={{background:"rgba(200,160,80,0.06)",border:"1px solid rgba(200,160,80,0.18)",
                borderRadius:4,padding:"2px 7px",fontSize:9,color:"#8a7050",cursor:"pointer",fontFamily:"Georgia,serif"}}>
                {showComboRef?"▲ комбо":"📖 комбо"}</button>
            </div>
            <div style={{fontSize:10,color:"#5a4020",fontFamily:"Georgia,serif"}}>В руке: {hand.length} / 5</div>
          </div>
          {showComboRef&&(
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,
              marginBottom:8,scrollbarWidth:"none"}}>
              {COMBOS.map(c=>(
                <div key={c.name} style={{flexShrink:0,width:64,
                  background:"rgba(0,0,0,0.55)",border:"1px solid rgba(200,154,60,0.35)",
                  borderRadius:6,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                  <img src={getComboArt(c.name)} alt="" style={{
                    width:64,height:58,objectFit:"cover",display:"block"}}/>
                  <div style={{padding:"3px 4px 4px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#c8a060",letterSpacing:0.5}}>
                      {c.needs.map(t=>CARDS[t]?.e).join("+")}
                    </div>
                    <div style={{fontSize:7,color:"#8a7050",fontFamily:"Georgia,serif",
                      marginTop:1,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",
                      display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                      {c.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {played.length>0&&(
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"5px 8px",
                background:"rgba(200,154,60,0.06)",borderRadius:8,border:"1px solid rgba(200,154,60,0.2)"}}>
                <span style={{fontSize:9,color:"#8a6020",fontFamily:"Georgia,serif",alignSelf:"center"}}>В ход:</span>
                {played.map((p,i)=>{
                  const def=CARDS[p.card.type];
                  return <div key={p.card.uid} style={{fontSize:9,background:"rgba(200,154,60,0.15)",
                    border:`1px solid ${def.c}55`,borderRadius:5,padding:"3px 8px",
                    color:def.c,fontFamily:"Georgia,serif",animation:`cardPlay 0.8s ${i*0.1}s both`}}>
                    {def.e} {def.n}{p.target?` →${en(p.target)}`:""}
                  </div>;
                })}
                {combo&&<div style={{fontSize:9,background:"rgba(224,154,60,0.2)",
                  border:"1px solid rgba(224,154,60,0.5)",borderRadius:5,padding:"3px 8px",
                  color:"#e09a3c",fontFamily:"Georgia,serif",fontWeight:700}}>✨ КОМБО</div>}
              </div>
              {combo&&<div style={{fontSize:10,color:"#e09a3c",fontFamily:"Georgia,serif",
                marginTop:4,textAlign:"center",animation:"pulse 1s infinite",letterSpacing:0.5}}>
                ✨ КОМБО: {combo.name} — будет применено при завершении хода
              </div>}
            </div>)}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",minHeight:80}}>
            {hand.map(card=>{
              const def=CARDS[card.type];
              const sel=!!played.find(p=>p.card.uid===card.uid);
              const jp=jointCard?.uid===card.uid;
              const notOd=odLeft<def.od&&!sel&&!jp;
              const isCb=combo&&comboTypes.includes(card.type)&&sel;
              return <GameCard key={card.uid} card={card} selected={sel} jointPending={jp}
                dimmed={!isP||notOd} notEnoughOd={notOd} comboWith={isCb}
                onPreview={()=>handlePreview(card)}/>;
            })}
          </div>
          {phase==="player"&&!loading&&(
            <div style={{fontSize:9,color:"#3a2808",marginTop:8,textAlign:"center",fontFamily:"Georgia,serif"}}>
              💡 Нажми на карту, чтобы выбрать действие
            </div>)}
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
        <div style={{display:isMobile&&activeTab==="chat"?"none":"flex",alignItems:"center",gap:12,padding:"10px 14px",
          background:"rgba(0,0,0,0.65)",border:"1px solid rgba(200,160,80,0.15)",
          borderRadius:10,flexWrap:"wrap"}}>

          {/* Player avatar + name */}
          {playerName&&(
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
                background:"rgba(200,160,80,0.1)",
                border:"2px solid rgba(200,160,80,0.3)",overflow:"hidden",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {playerAvatar
                  ?<img src={playerAvatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<svg viewBox="0 0 100 100" width="100%" height="100%">
                    <circle cx="50" cy="34" r="22" fill="#8a7050"/>
                    <ellipse cx="50" cy="96" rx="34" ry="30" fill="#8a7050"/>
                  </svg>}
              </div>
              <div style={{fontSize:11,color:"#c8b080",fontFamily:"Georgia,serif",fontWeight:700,maxWidth:80,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{playerName}</div>
            </div>
          )}
          {playerName&&<div style={{width:1,height:60,background:"rgba(200,160,80,0.1)",flexShrink:0}}/>}

          {/* HP + player effects */}
          <div data-entity="you" style={{display:"flex",flexDirection:"column",gap:4,minWidth:150}}>
            <div style={{fontSize:9,letterSpacing:1,color:"#4a3010",fontFamily:"Georgia,serif"}}>ЗДОРОВЬЕ</div>
            <HpBar hp={gs.you.hp} maxHp={MHP.you} color="#4c7fe0" flash={flash.you}/>
            <EffectBadges poison={gs.you.poison} bleed={gs.you.bleed}/>
            {gs.you.hp<=0&&<div style={{fontSize:9,color:"#e05252",fontFamily:"Georgia,serif",
              animation:"pulse 1s infinite"}}>⚰️ Пал в бою</div>}
          </div>

          <div style={{width:1,height:60,background:"rgba(200,160,80,0.1)",flexShrink:0}}/>

          {/* AP crystals */}
          <div data-tutorial="ap" style={{display:"flex",flexDirection:"column",gap:4}}
            title="Очки действия (ОД). Каждая карта стоит 1-2 ОД. В начале хода: +2 ОД. Пропуск хода: +1 ОД в запас.">
            <div style={{fontSize:9,letterSpacing:1,color:"#4a3010",fontFamily:"Georgia,serif"}}>ОЧКИ ДЕЙСТВИЯ</div>
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              {Array.from({length:od},(_,i)=><Crystal key={i} active={i<odLeft} size={28}/>)}
              <span style={{fontSize:9,color:"#5a4020",fontFamily:"Georgia,serif",marginLeft:4}}>+2/ход</span>
            </div>
          </div>

          <div style={{width:1,height:60,background:"rgba(200,160,80,0.1)",flexShrink:0}}/>

          {/* Deck stack + Fatigue — center block */}
          <div data-tutorial="deck" style={{display:"flex",alignItems:"center",gap:10}}>
            <DeckStack count={sharedDeck.length} fatigueCycle={fatigueCycle}/>
            <div title={`Цикл ${fatigueCycle}. ${fatigueCycle>1?`Каждая карта −${fatigueCycle===2?3:fatigueCycle===3?6:10}HP`:"Изнурения нет"}`}
              style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",
              borderRadius:6,border:`1px solid ${fatigueCycle>1?"rgba(224,82,82,0.35)":"rgba(200,160,80,0.08)"}`,
              background:fatigueCycle>1?"rgba(224,82,82,0.08)":"rgba(0,0,0,0.2)",
              transition:"all 0.3s",cursor:"help"}}>
              <img src={FATIGUE_ICON} alt="" style={{width:22,height:22,objectFit:"contain",
                opacity:fatigueCycle>1?1:0.22,
                filter:fatigueCycle>1?"drop-shadow(0 0 5px rgba(224,82,82,0.7))":"none",
                transition:"all 0.3s"}}/>
              <div style={{fontFamily:"Georgia,serif",lineHeight:1.15}}>
                <div style={{fontSize:8,color:fatigueCycle>1?"#a04040":"#4a3010",letterSpacing:1}}>ИЗНУРЕНИЕ</div>
                <div style={{fontSize:10,fontWeight:700,color:fatigueCycle>1?"#e05252":"#3a2808"}}>
                  {fatigueCycle>1?`⚠ −${fatigueCycle===2?3:fatigueCycle===3?6:10}HP/🃏`:"Цикл 1 — без штрафов"}
                </div>
              </div>
            </div>
          </div>

          {/* Turn */}
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:9,letterSpacing:1,color:"#4a3010",fontFamily:"Georgia,serif"}}>ХОД</div>
            <div style={{fontSize:18,fontWeight:700,color:"#c8b080",fontFamily:"Georgia,serif",lineHeight:1}}>{turn}</div>
          </div>

          <div style={{flex:1}}/>

          {/* Buttons */}
          <button onClick={skipTurn} disabled={!isP||gs.you.hp<=0||animating}
            title="Пропустить ход: +1 очко действий в запас на следующий ход"
            style={{
            background:"rgba(200,160,80,0.04)",color:isP&&!animating?"#7a6035":"#2a1808",
            border:"1px solid rgba(200,160,80,0.15)",borderRadius:7,
            padding:"7px 12px",fontSize:9,fontWeight:600,cursor:isP&&!animating?"pointer":"default",
            fontFamily:"Georgia,serif",letterSpacing:0.5,opacity:isP&&!animating?1:0.4}}>
            ВЫЖДАТЬ<br/>+1 ОД
          </button>
          <button onClick={endTurn} disabled={!canEnd||animating} style={{
            background:canEnd&&!animating?"linear-gradient(135deg,#7a3e00,#d4841a)":"rgba(255,255,255,0.04)",
            color:canEnd&&!animating?"#fff":"#2a1808",border:canEnd&&!animating?"1px solid rgba(220,140,40,0.5)":"none",
            borderRadius:8,padding:"12px 28px",fontSize:13,fontWeight:900,
            cursor:canEnd&&!animating?"pointer":animating?"not-allowed":"default",fontFamily:"Georgia,serif",letterSpacing:1,
            boxShadow:canEnd&&!animating?"0 0 28px rgba(210,130,20,0.55),0 2px 8px rgba(0,0,0,0.5)":"none",
            transition:"all 0.2s"}}>
            {loading?"⏳ Ждём…":animating?"⚡ Ход…":"Конец хода ▶"}
          </button>
        </div>

      </div>

      {/* Mobile tab bar */}
      {isMobile&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,height:56,zIndex:200,
          display:"flex",background:"rgba(8,5,2,0.97)",
          borderTop:"1px solid rgba(200,160,80,0.25)",backdropFilter:"blur(4px)"}}>
          {[
            {tab:"battle",label:"⚔ Бой"},
            {tab:"cards", label:"🎴 Карты"},
            {tab:"chat",  label:"💬 Чат"},
          ].map(({tab,label})=>(
            <button key={tab} onClick={()=>{setActiveTab(tab);activeTabRef.current=tab;if(tab==="chat")setUnreadChat(0);}} style={{
              flex:1,border:"none",cursor:"pointer",
              background:activeTab===tab?"rgba(200,160,80,0.15)":"transparent",
              color:activeTab===tab?"#c8b080":"#5a4a30",
              fontSize:11,fontFamily:"Georgia,serif",
              display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:3,
              borderTop:activeTab===tab?"2px solid rgba(200,160,80,0.6)":"2px solid transparent",
              transition:"all 0.15s",position:"relative"}}>
              {label}
              {tab==="chat"&&unreadChat>0&&(
                <div style={{position:"absolute",top:6,right:"22%",minWidth:16,height:16,borderRadius:8,
                  background:"#e05252",color:"#fff",fontSize:9,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>
                  {unreadChat>9?"9+":unreadChat}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Trade modal */}
      {tradeOffer&&phase!=="mulligan"&&(
        <div style={{position:"fixed",inset:0,zIndex:75,display:"flex",alignItems:"center",
          justifyContent:"center",background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",
          animation:"fadeIn 0.3s"}} onClick={()=>{setTradeOffer(null);setTradeSel(null);}}>
          <div style={{background:"linear-gradient(135deg,#0a1a12,#0e2018)",
            border:"1px solid rgba(76,175,130,0.4)",borderRadius:16,padding:"28px 36px",
            maxWidth:740,width:"90%",animation:"scaleIn 0.3s cubic-bezier(.15,1.2,.3,1)",
            boxShadow:"0 0 60px rgba(76,175,130,0.2)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,letterSpacing:3,color:"#4caf82",
              fontFamily:"Georgia,serif",textAlign:"center",marginBottom:20}}>ОБМЕН КАРТАМИ</div>
            <div style={{display:"flex",gap:28,alignItems:"center",justifyContent:"center",marginBottom:24,flexWrap:"wrap"}}>
              {/* Alex's card — shown face-up immediately */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <div style={{fontSize:10,color:"#3a7048",fontFamily:"Georgia,serif",letterSpacing:1}}>СОЮЗНИК ДАЁТ</div>
                <div style={{width:100,height:150,borderRadius:8,overflow:"hidden",
                  boxShadow:"0 0 20px rgba(76,175,130,0.4)",position:"relative",
                  background:`linear-gradient(135deg,${CARDS[tradeOffer.type]?.c}22,rgba(0,0,0,0.8))`,
                  border:`2px solid ${CARDS[tradeOffer.type]?.c}88`,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
                  {ART[tradeOffer.type]
                    ?<img src={ART[tradeOffer.type]} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.7}}/>
                    :null}
                  <div style={{position:"relative",fontSize:32,zIndex:1}}>{CARDS[tradeOffer.type]?.e}</div>
                  <div style={{position:"relative",fontSize:10,color:"#e8d090",fontFamily:"Georgia,serif",fontWeight:700,zIndex:1,textAlign:"center",padding:"0 4px"}}>
                    {CARDS[tradeOffer.type]?.n}</div>
                </div>
                <div style={{fontSize:9,color:"#4caf82",fontFamily:"Georgia,serif"}}>{CARDS[tradeOffer.type]?.d}</div>
              </div>

              <div style={{fontSize:32,color:"#4caf82"}}>⇄</div>

              {/* Player's hand */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <div style={{fontSize:10,color:"#3a7048",fontFamily:"Georgia,serif",letterSpacing:1}}>ТЫ ДАЁШЬ (выбери)</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                  {hand.map(card=>{
                    const def=CARDS[card.type];
                    const sel=tradeSel===card.uid;
                    return(
                      <div key={card.uid} onClick={()=>setTradeSel(sel?null:card.uid)}
                        style={{width:70,height:105,borderRadius:6,overflow:"hidden",cursor:"pointer",
                          position:"relative",transition:"transform 0.15s",
                          transform:sel?"translateY(-8px) scale(1.06)":"none",
                          boxShadow:sel?"0 0 16px #e09a3c,0 4px 12px rgba(0,0,0,0.6)":"0 2px 8px rgba(0,0,0,0.5)",
                          border:sel?"2px solid #e09a3c":"2px solid transparent"}}>
                        {ART[card.type]
                          ?<img src={ART[card.type]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          :<div style={{width:"100%",height:"100%",background:"rgba(10,8,5,0.9)",
                            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                            <span style={{fontSize:20}}>{def.e}</span>
                            <span style={{fontSize:8,color:def.c,fontFamily:"Georgia,serif"}}>{def.n}</span>
                          </div>}
                        <div style={{position:"absolute",bottom:0,left:0,right:0,
                          background:"rgba(0,0,0,0.75)",padding:"3px",textAlign:"center"}}>
                          <div style={{fontSize:8,color:def.c,fontFamily:"Georgia,serif",fontWeight:700}}>{def.n}</div>
                        </div>
                        {sel&&<div style={{position:"absolute",top:3,right:3,
                          fontSize:12,filter:"drop-shadow(0 0 4px gold)"}}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button disabled={!tradeSel}
                onClick={async()=>{
                  const selCard=hand.find(c=>c.uid===tradeSel);
                  if(!selCard)return;
                  // Alex evaluates the offered card — declines weak ones more often
                  const weakCards=["energy","spy","perebor"];
                  const isWeak=weakCards.includes(selCard.type);
                  const willDecline=isWeak?Math.random()<0.65:Math.random()<0.15;
                  if(willDecline){
                    setTradeOffer(null);setTradeSel(null);
                    await alexSpeak("trade_declined",gs);
                    return;
                  }
                  setHand(h=>[...h.filter(c=>c.uid!==tradeSel),{uid:nuid(),type:tradeOffer.type,flipIn:true}]);
                  setTimeout(()=>setHand(h=>h.map(c=>({...c,flipIn:false}))),700);
                  setAlexHand(h=>[...h.filter((_,i)=>i!==tradeOffer.idx),selCard.type]);
                  setCoopScore(s=>s+1);
                  setTradeOffer(null);setTradeSel(null);
                  alexSpeak("trade_accepted",gs);
                }}
                style={{background:tradeSel?"linear-gradient(135deg,#1a5530,#2a9060)":"rgba(255,255,255,0.04)",
                  color:tradeSel?"#7be0b0":"#2a3028",
                  border:tradeSel?"1px solid rgba(76,175,130,0.5)":"1px solid rgba(255,255,255,0.06)",
                  borderRadius:8,padding:"11px 26px",fontSize:12,fontWeight:700,
                  cursor:tradeSel?"pointer":"default",fontFamily:"Georgia,serif",letterSpacing:0.5}}>
                ОБМЕНЯТЬСЯ ⇄
              </button>
              <button onClick={()=>{setTradeOffer(null);setTradeSel(null);alexSpeak("trade_declined",gs);}}
                style={{background:"rgba(200,60,60,0.08)",color:"#a04040",
                  border:"1px solid rgba(200,60,60,0.25)",borderRadius:8,padding:"11px 20px",
                  fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                ОТКАЗАТЬ</button>
            </div>
          </div>
        </div>
      )}


      {/* Mulligan overlay — only after tutorial is done */}
      {phase==="mulligan"&&!showTutorial&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:99,backdropFilter:"blur(12px)",animation:"fadeIn 0.3s"}}>
          <div style={{background:"linear-gradient(135deg,#0e0a06,#180e04)",
            border:"1px solid rgba(200,160,80,0.3)",borderRadius:16,padding:"36px 48px",textAlign:"center",
            boxShadow:"0 0 60px rgba(200,120,20,0.3)",maxWidth:820}}>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:4,fontFamily:"Georgia,serif",
              color:"#c8901c",marginBottom:6}}>СТАРТОВАЯ РУКА</div>
            <div style={{fontSize:12,color:"#6a5030",marginBottom:22,fontFamily:"Georgia,serif"}}>
              Нажми на карту, чтобы отметить её для замены (до 2 карт) — или сразу жми «В бой»
            </div>
            <div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:18,flexWrap:"wrap"}}>
              {hand.map(card=>{
                const marked=mulliganMarked.has(card.uid);
                return(
                  <div key={card.uid} style={{cursor:"pointer",position:"relative",
                    transform:marked?"translateY(-15px)":"none",transition:"transform 0.2s"}}>
                    <GameCard card={card} selected={false} dimmed={false}
                      notEnoughOd={false} jointPending={false} comboWith={false}
                      onPreview={()=>{
                        setMulliganMarked(s=>{const ns=new Set(s);
                          if(ns.has(card.uid))ns.delete(card.uid);
                          else if(ns.size<2)ns.add(card.uid);return ns;});
                      }}/>
                    {marked&&<div style={{position:"absolute",inset:0,borderRadius:8,
                      border:"2px solid #e05252",pointerEvents:"none",
                      boxShadow:"0 0 14px rgba(224,82,82,0.5)"}}/>}
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:11,color:"#6a5030",marginBottom:18,fontFamily:"Georgia,serif"}}>
              Выбрано для замены: {mulliganMarked.size} / 2
            </div>
            <button onClick={()=>{
              let deck=[...sharedDeck];let cycle=fatigueCycle;
              const kept=hand.filter(c=>!mulliganMarked.has(c.uid));
              const{cards:replacements,deck:d2,cycle:c2}=drawFromDeck(mulliganMarked.size,deck,cycle);
              setHand([...kept,...replacements]);
              setSharedDeck(d2);setFatigueCycle(c2);
              setMulliganMarked(new Set());setPhase("player");
            }} style={{background:"linear-gradient(135deg,#7a4008,#c87820)",color:"#fff",
              border:"none",borderRadius:8,padding:"14px 44px",fontSize:13,fontWeight:700,letterSpacing:2,
              cursor:"pointer",fontFamily:"Georgia,serif",boxShadow:"0 0 30px rgba(200,120,20,0.4)"}}>
              Начать ▶
            </button>
          </div>
        </div>)}

      {/* Overflow discard overlay */}
      {phase==="overflow"&&pendingDrawCard&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:99,backdropFilter:"blur(8px)",animation:"fadeIn 0.2s"}}>
          <div style={{background:"linear-gradient(135deg,#0e0a06,#180e04)",
            border:"1px solid rgba(200,160,80,0.3)",borderRadius:16,padding:"36px 48px",textAlign:"center",
            boxShadow:"0 0 50px rgba(200,120,20,0.3)",maxWidth:640}}>
            <div style={{fontSize:18,fontWeight:900,letterSpacing:3,fontFamily:"Georgia,serif",
              color:"#e09a3c",marginBottom:8}}>РУКА ПОЛНА</div>
            <div style={{fontSize:12,color:"#6a5030",marginBottom:6,fontFamily:"Georgia,serif"}}>
              В руке нет места. Новая карта:
            </div>
            <div style={{display:"inline-block",border:"2px solid #c8901c",borderRadius:8,
              padding:"10px 16px",background:"rgba(200,144,28,0.1)",marginBottom:16}}>
              <div style={{fontSize:22}}>{CARDS[pendingDrawCard.type]?.e}</div>
              <div style={{fontSize:11,color:CARDS[pendingDrawCard.type]?.c,fontFamily:"Georgia,serif",marginTop:4}}>
                {CARDS[pendingDrawCard.type]?.n}
              </div>
            </div>
            <div style={{fontSize:11,color:"#8a7050",marginBottom:6,fontFamily:"Georgia,serif"}}>
              Выбери карту для сброса или откажись от новой:
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20,flexWrap:"wrap"}}>
              {hand.map(card=>{
                const def=CARDS[card.type];
                return <div key={card.uid} onClick={()=>{
                  setHand(h=>[...h.filter(c=>c.uid!==card.uid),{...pendingDrawCard,flipIn:true}]);
                  setTimeout(()=>setHand(h=>h.map(c=>({...c,flipIn:false}))),700);
                  setDrawCooldown(2);
                  setPendingDrawCard(null);setPhase("player");
                }} style={{cursor:"pointer",border:"1.5px solid rgba(200,160,80,0.3)",
                  borderRadius:8,padding:"8px 12px",background:"rgba(0,0,0,0.5)",
                  transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                  <div style={{fontSize:16}}>{def.e}</div>
                  <div style={{fontSize:10,color:def.c,fontFamily:"Georgia,serif",marginTop:3}}>{def.n}</div>
                </div>;
              })}
            </div>
            <button onClick={()=>{
              setDrawCooldown(0);
              setPendingDrawCard(null);setPhase("player");
            }} style={{background:"rgba(255,255,255,0.06)",color:"#6a5030",
              border:"1px solid rgba(200,160,80,0.2)",borderRadius:6,padding:"8px 20px",
              fontSize:10,cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Не брать новую карту
            </button>
          </div>
        </div>)}

      {/* Condition brief — shown after Survey1 before game */}
      {showCondBrief&&condition&&survey1Data&&(
        <ConditionBriefScreen
          condition={condition}
          ingroup={survey1Data.ingroup}
          partnerAvatar={gameAvatars?.avatar_partner}
          allyNick={allyNick}
          onStart={()=>{setShowCondBrief(false);setShowMatchmaking(true);}}
        />
      )}

      {/* Tutorial overlay */}
      {showMatchmaking&&<MatchmakingScreen onReady={()=>setShowMatchmaking(false)}/>}
      {showTutorial&&!showSetup&&!showSurvey1&&!showCondBrief&&!showMatchmaking&&<Tutorial allyNick={allyNick} e1Nick={e1Nick} e2Nick={e2Nick} onEnd={()=>setShowTutorial(false)} setActiveTab={switchTab}/>}

      {/* Pre-game survey — shown first, before setup screen */}
      {showSurvey1&&<Survey type="pre" blockOrder={blockOrder} onComplete={data=>{
        setSurvey1Data(data);
        setShowSurvey1(false);
        const cond = assignCondition();
        const avatars = assignAvatars(cond, data.ingroup);
        setCondition(cond);
        setGameAvatars(avatars);
        /* pick persona + nickname for ally */
        const persona = selectPersona(cond, data.ingroup);
        const nick = pickNickname(persona);
        setAllyPersona(persona);
        setAllyNick(nick);
        localStorage.setItem("ally_nick", nick);
        /* pick enemy nicks from the same persona pool, excluding ally nick */
        const enemyNickList = persona.NICKNAMES.filter(n => n !== nick);
        const e1n = enemyNickList.length > 0 ? enemyNickList[Math.floor(Math.random() * enemyNickList.length)] : "Противник";
        const e2nPool = enemyNickList.filter(n => n !== e1n);
        const e2n = e2nPool.length > 0 ? e2nPool[Math.floor(Math.random() * e2nPool.length)] : "Лазутчик";
        setE1Nick(e1n);
        setE2Nick(e2n);
        localStorage.setItem("e1_nick", e1n);
        localStorage.setItem("e2_nick", e2n);
        /* stamp condition + avatars + nicks into the session record (nick_self/avatar_self added after setup) */
        const session = getCurrentSession();
        if(session){
          const updated = {...session, condition:cond, ally_nick:nick, e1_nick:e1n, e2_nick:e2n, ...avatars};
          saveCurrentSession(updated);
          upsertResponse(updated);
        }
        /* show setup screen (nickname + avatar) before revealing partner info */
        setShowSetup(true);
      }}/>}

      {/* Post-game survey — shown after game ends, above game-over screen */}
      {showSurvey2&&<Survey type="post" blockOrder={blockOrder} onComplete={data=>{setSurvey2Data(data);setShowSurvey2(false);}}/>}

      {/* Export: /api/export-csv?secret=YOUR_SECRET (server-side) */}

      {/* Player setup screen — shown on first run, before everything */}
      {showSetup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(8,5,2,0.97)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(8px)"}}>
          <div style={{background:"linear-gradient(135deg,#1a1208,#2d1f0a)",border:"2px solid #8b6914",
            borderRadius:12,padding:"40px",maxWidth:480,width:"90%",textAlign:"center",
            color:"#e8d5a0",fontFamily:"Georgia,serif",animation:"scaleIn 0.3s cubic-bezier(.15,1.2,.3,1)",
            boxShadow:"0 0 80px rgba(200,140,20,0.3)"}}>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:3,color:"#c8901c",marginBottom:6}}>КАК ТЕБЯ ЗОВУТ?</div>
            <div style={{fontSize:12,color:"#6a5030",marginBottom:24}}>Введи имя для игры · Фото необязательно</div>
            {/* Hidden file input */}
            <input ref={setupFileRef} type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{
                const file=e.target.files?.[0];if(!file)return;
                const reader=new FileReader();
                reader.onload=ev=>setSetupAvatarImg(ev.target.result);
                reader.readAsDataURL(file);
              }}/>
            {/* Avatar upload circle */}
            <div onClick={()=>setupFileRef.current?.click()}
              style={{width:100,height:100,borderRadius:"50%",margin:"0 auto 10px",cursor:"pointer",
                background:"rgba(200,160,80,0.08)",border:"3px solid rgba(200,160,80,0.35)",
                overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:setupAvatarImg?"0 0 22px rgba(200,140,20,0.45)":"none",
                transition:"box-shadow 0.25s"}}>
              {setupAvatarImg
                ?<img src={setupAvatarImg} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<svg viewBox="0 0 100 100" width="60%" height="60%">
                  <circle cx="50" cy="34" r="22" fill="#5a4a3a"/>
                  <ellipse cx="50" cy="96" rx="34" ry="30" fill="#5a4a3a"/>
                </svg>}
            </div>
            <div style={{fontSize:11,color:"#4a3010",marginBottom:20,textAlign:"center"}}>
              {setupAvatarImg?"✓ Фото загружено · нажми для замены":"Нажми для загрузки фото (необязательно)"}
            </div>
            <input value={setupName} onChange={e=>setSetupName(e.target.value.slice(0,16))}
              placeholder="Твоё имя…" maxLength={16}
              style={{width:"100%",padding:"10px 14px",background:"rgba(200,160,80,0.08)",
                border:"1px solid rgba(200,160,80,0.3)",borderRadius:8,fontSize:14,
                color:"#e8d5a0",outline:"none",fontFamily:"Georgia,serif",
                boxSizing:"border-box",marginBottom:24,textAlign:"center"}}/>
            <button disabled={!setupName.trim()}
              onClick={()=>{
                const name=setupName.trim();
                const avatar=setupAvatarImg||null;
                localStorage.setItem("playerSetupDone","true");
                localStorage.setItem("playerName",name);
                if(avatar) localStorage.setItem("player_avatar",avatar);
                setPlayerName(name);setPlayerAvatar(avatar);setShowSetup(false);
                /* stamp nick_self + avatar_self now that setup is complete */
                const session=getCurrentSession();
                if(session){
                  const updated={...session,nick_self:name,avatar_self:avatar};
                  saveCurrentSession(updated);
                  upsertResponse(updated);
                }
                setShowCondBrief(true);
              }}
              style={{background:setupName.trim()
                ?"linear-gradient(135deg,#7a4008,#c87820)":"rgba(255,255,255,0.06)",
                color:setupName.trim()?"#fff":"#3a2808",
                border:"none",borderRadius:8,padding:"14px 44px",fontSize:14,fontWeight:900,
                letterSpacing:2,cursor:setupName.trim()?"pointer":"default",
                fontFamily:"Georgia,serif",
                boxShadow:setupName.trim()?"0 0 30px rgba(200,120,20,0.5)":"none",
                transition:"all 0.2s"}}>
              НАЧАТЬ →
            </button>
          </div>
        </div>
      )}

      {/* Game over */}
      {phase==="over"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:99,backdropFilter:"blur(12px)",animation:"fadeIn 0.3s"}}>
          <div style={{background:"linear-gradient(135deg,#0e0a06,#180e04)",
            border:"1px solid rgba(200,160,80,0.3)",borderRadius:16,padding:"50px 60px",textAlign:"center",
            boxShadow:"0 0 60px rgba(200,120,20,0.3)"}}>
            <div style={{fontSize:26,fontWeight:900,letterSpacing:4,fontFamily:"Georgia,serif",
              color:winner==="player"?"#4caf82":"#e05252",marginBottom:12,
              textShadow:`0 0 30px ${winner==="player"?"rgba(76,175,130,0.6)":"rgba(224,82,82,0.6)"}`}}>
              {winner==="player"?"ПОБЕДА!":"ПОРАЖЕНИЕ"}</div>
            <div style={{fontSize:12,color:"#4a3010",marginBottom:8,fontFamily:"Georgia,serif"}}>Ход {turn}</div>
            <div style={{display:"flex",gap:24,justifyContent:"center",marginBottom:18}}>
              <div style={{fontSize:12,color:"#8a7050",fontFamily:"Georgia,serif"}}>
                🤝 Слаженность команды: <span style={{color:"#4caf82",fontWeight:700}}>{cooperationScore}</span>
              </div>
            </div>
            <div style={{fontSize:13,color:"#8a7050",marginBottom:34,lineHeight:1.8,fontFamily:"Georgia,serif"}}>
              {winner==="player"?"Отлично сыграно — команда победила!":"Используй комбо и следи за здоровьем союзника. Удачи!"}</div>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              {!survey2Data&&!showSurvey2&&(
                <button onClick={()=>setShowSurvey2(true)}
                  style={{background:"linear-gradient(135deg,#1a3a5c,#2d6496)",color:"#fff",
                  border:"none",borderRadius:8,padding:"12px 36px",fontSize:12,fontWeight:700,letterSpacing:2,
                  cursor:"pointer",fontFamily:"Georgia,serif",boxShadow:"0 0 30px rgba(45,100,150,0.4)"}}>
                  ПРОДОЛЖИТЬ →</button>
              )}
              {survey2Data&&<>
                <button onClick={restart} style={{background:"linear-gradient(135deg,#7a4008,#c87820)",color:"#fff",
                  border:"none",borderRadius:8,padding:"12px 36px",fontSize:12,fontWeight:700,letterSpacing:2,
                  cursor:"pointer",fontFamily:"Georgia,serif",boxShadow:"0 0 30px rgba(200,120,20,0.4)"}}>
                  ИГРАТЬ СНОВА</button>
                <button onClick={()=>{setShowTutorial(true);localStorage.removeItem("tutorialDone");}}
                  style={{background:"rgba(200,160,80,0.08)",color:"#8a7050",
                  border:"1px solid rgba(200,160,80,0.25)",borderRadius:8,padding:"12px 22px",fontSize:12,
                  cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:1}}>
                  ОБУЧЕНИЕ</button>
              </>}
            </div>
          </div>
        </div>)}
    </div>
  );
}
