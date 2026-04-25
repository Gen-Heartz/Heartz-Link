/* =============================================
   HEARTZ LINK — Characters System
   Full JS: Classes, Resources, Skills, EXP,
   Derived Attributes, Element System,
   Save/Load, List UI
   v3 — Complete Element trait DB + upgrade system
   ============================================= */

(function () {
    'use strict';

    const STORAGE_KEY = 'heartzlink_characters';

    function getCharacters() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; } }
    function saveCharacters(l) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); } catch (e) { console.error(e); } }
    function generateId() { return 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8); }

    /* ═══ TYPE DATA ═══ */
    const TYPE_DATA = {
        'Fast':       { healthPerLvl:3, manaPerLvl:2, cpBase:2, baseAtk:2, baseReflex:4, move:2, atkBonus:1, magicBonus:0, enchBase:1, controlBase:2 },
        'Fast+':      { healthPerLvl:2, manaPerLvl:3, cpBase:3, baseAtk:1, baseReflex:4, move:2, atkBonus:0, magicBonus:1, enchBase:1, controlBase:2 },
        'Fast++':     { healthPerLvl:2, manaPerLvl:2, cpBase:2, baseAtk:1, baseReflex:5, move:3, atkBonus:0, magicBonus:0, enchBase:1, controlBase:2 },
        'Neutral':    { healthPerLvl:3, manaPerLvl:2, cpBase:4, baseAtk:2, baseReflex:1, move:0, atkBonus:1, magicBonus:2, enchBase:2, controlBase:3 },
        'Neutral+':   { healthPerLvl:2, manaPerLvl:2, cpBase:4, baseAtk:1, baseReflex:2, move:1, atkBonus:0, magicBonus:2, enchBase:2, controlBase:3 },
        'Neutral++':  { healthPerLvl:2, manaPerLvl:3, cpBase:5, baseAtk:1, baseReflex:1, move:0, atkBonus:0, magicBonus:3, enchBase:2, controlBase:3 },
        'Strong':     { healthPerLvl:2, manaPerLvl:2, cpBase:2, baseAtk:4, baseReflex:2, move:1, atkBonus:2, magicBonus:0, enchBase:1, controlBase:2 },
        'Strong+':    { healthPerLvl:2, manaPerLvl:3, cpBase:3, baseAtk:4, baseReflex:1, move:0, atkBonus:2, magicBonus:1, enchBase:1, controlBase:2 },
        'Strong++':   { healthPerLvl:3, manaPerLvl:2, cpBase:2, baseAtk:5, baseReflex:1, move:0, atkBonus:3, magicBonus:0, enchBase:1, controlBase:2 },
        'Sorcerer-':  { healthPerLvl:1, manaPerLvl:7, cpBase:5, baseAtk:1, baseReflex:1, move:0, atkBonus:0, magicBonus:3, enchBase:3, controlBase:4 },
        'Sorcerer':   { healthPerLvl:1, manaPerLvl:8, cpBase:5, baseAtk:1, baseReflex:2, move:1, atkBonus:0, magicBonus:3, enchBase:3, controlBase:4 },
        'Sorcerer+':  { healthPerLvl:1, manaPerLvl:9, cpBase:5, baseAtk:1, baseReflex:3, move:2, atkBonus:0, magicBonus:3, enchBase:3, controlBase:4 },
        'Sorcerer++': { healthPerLvl:1, manaPerLvl:10,cpBase:7, baseAtk:1, baseReflex:1, move:0, atkBonus:0, magicBonus:5, enchBase:3, controlBase:4 }
    };

    const KNIGHT_OV = { healthPerLvl:6, manaPerLvl:0, cpBase:4, baseAtk:4, baseReflex:1, move:1, atkBonus:2, magicBonus:0, enchBase:1, controlBase:2 };

    /* ═══ CLASS DATA ═══ */
    const CLASS_DATA = {
        'Archer':               { type:'Fast+',      elCount:3, elDesc:'Natural + Divergent + Mystic',                   allowedCats:['Natural','Divergent','Mystic'] },
        'Assassin':             { type:'Fast+',      elCount:5, elDesc:'Natural + Mystic + 3 Poison',                    allowedCats:['Natural','Mystic','Poison'] },
        'Berserk':              { type:'Strong',     elCount:5, elDesc:'Natural + Divergent + 3 Blood',                  allowedCats:['Natural','Divergent','Blood'] },
        'Blood Hunter':         { type:'Neutral',    elCount:3, elDesc:'Natural + Divergent + Blood',                    allowedCats:['Natural','Divergent','Blood'] },
        'Warlock':              { type:'Sorcerer-',  elCount:3, elDesc:'Natural + Poison',                               allowedCats:['Natural','Poison'] },
        'Hunter':               { type:'Strong+',    elCount:3, elDesc:'Natural + Divergent + Mystic',                   allowedCats:['Natural','Divergent','Mystic'] },
        'Tamer':                { type:'Neutral+',   elCount:3, elDesc:'Natural + Divergent + Mystic',                   allowedCats:['Natural','Divergent','Mystic'] },
        'Duelist':              { type:'Fast',       elCount:2, elDesc:'Natural + Divergent',                            allowedCats:['Natural','Divergent'] },
        'Wielder':              { type:'Fast',       elCount:3, elDesc:'Natural + Divergent + Mystic',                   allowedCats:['Natural','Divergent','Mystic'] },
        'Monk':                 { type:'Neutral',    elCount:5, elDesc:'Natural + Divergent + 3 Holy Traits',            allowedCats:['Natural','Divergent','Holy'] },
        'Necromancer':          { type:'Sorcerer++', elCount:3, elDesc:'Natural + Dark',                                 allowedCats:['Natural','Dark'] },
        'Sage':                 { type:'Sorcerer+',  elCount:3, elDesc:'Natural + Divergent + Racial',                   allowedCats:['Natural','Divergent','Mystic','Holy','Dark','Blood','Poison'] },
        'Samurai':              { type:'Fast++',     elCount:4, elDesc:'Natural + Mystic + 3 Blood Traits',              allowedCats:['Natural','Mystic','Blood'] },
        'Knight':               { type:'Strong+',    elCount:0, elDesc:'No Elements',                                    allowedCats:[], isKnight:true },
        'Healer':               { type:'Sorcerer+',  elCount:2, elDesc:'Holy + Natural (restricted)',                    allowedCats:['Holy','Water','Earth','Air','Ice','Vine'] },
        'Demonic Spiritualist': { type:'Neutral+',   elCount:3, elDesc:'Natural + Divergent + Mystic',                   allowedCats:['Natural','Divergent','Mystic'] },
        'Mage':                 { type:'Sorcerer',   elCount:5, elDesc:'Natural + Divergent',                            allowedCats:['Natural','Divergent'] },
        'Battle Mage':          { type:'Neutral++',  elCount:4, elDesc:'Natural + Divergent',                            allowedCats:['Natural','Divergent'] },
        'Paladin':              { type:'Strong++',   elCount:2, elDesc:'Natural + Holy',                                 allowedCats:['Natural','Holy'] },
        'Elemental Paladin':    { type:'Strong+',    elCount:3, elDesc:'Natural + Divergent',                            allowedCats:['Natural','Divergent'] },
        'Dark Paladin':         { type:'Strong++',   elCount:2, elDesc:'Natural + Dark',                                 allowedCats:['Natural','Dark'] }
    };

    /* Element categories for filtering */
    const ELEM_CATEGORIES = {
        'Natural':   ['Fire','Water','Earth','Air'],
        'Divergent': ['Lightning','Ice','Gravity','Sound'],
        'Mystic': ['Holy', 'Dark'],
        'Holy':      ['Holy'],
        'Dark':      ['Dark'],
        'Blood':     ['Blood'],
        'Poison':    ['Poison']
    };

    /* ═══ ELEMENT TRAITS DATABASE ═══ */
    const ELEM_DB = {
        'Fire': [
            { name:'Heat',         type:'Sequential Effect & Status', grade:1, costs:[1,2,4,6] },
            { name:'Cauterization',type:'Instant Effect',             grade:2, costs:[3,4,6,9] },
            { name:'Ashes',        type:'DoT Damage',                 grade:6, costs:[7,10,15,20] },
            { name:'Devour',       type:'Consecutive Damage',         grade:2, costs:[3,4,6,9] },
            { name:'Explosion',    type:'Area Damage',                grade:1, costs:[1,2,4,6] },
            { name:'Fusion',       type:'Lasting Effect',             grade:2, costs:[3,4,6,9] },
            { name:'Illumination', type:'Passive Effect & Status',    grade:1, costs:[1,2,4,6] },
            { name:'Purification', type:'Status Effect',              grade:3, costs:[5,7,10,15] },
            { name:'Burning',      type:'DoT & Status Effect',        grade:1, costs:[1,2,4,6] }
        ],
        'Water': [
            { name:'Dampening',     type:'Control Effect',            grade:2, costs:[3,4,6,9] },
            { name:'Hydrotherapy',  type:'Status Effect',             grade:3, costs:[5,7,10,15] },
            { name:'Electrification',type:'Control Effect',           grade:1, costs:[1,2,4,6] },
            { name:'Fluidity',      type:'Control Effect',            grade:1, costs:[1,2,4,6] },
            { name:'Humidification',type:'Passive + Control Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Neutralization',type:'Control Effect',            grade:2, costs:[3,4,6,9] },
            { name:'Purification',  type:'Status Effect',             grade:1, costs:[1,2,4,6] },
            { name:'Reflection',    type:'Instant Effect',            grade:3, costs:[5,7,10,15] },
            { name:'Transmutation', type:'Status Effect',             grade:2, costs:[3,4,6,9] }
        ],
        'Earth': [
            { name:'Granulation',  type:'Control Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Erosion',      type:'Status Effect',   grade:4, costs:[7,10,15,20] },
            { name:'Foundation',   type:'Control Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Immobilization',type:'Status Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Mimicry',      type:'Status Effect',   grade:2, costs:[3,4,6,9] },
            { name:'Shaping',      type:'Control Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Petrification',type:'Status Effect',   grade:5, costs:[10,15,20,28] },
            { name:'Regeneration', type:'Status Effect',   grade:2, costs:[3,4,6,9] },
            { name:'Resonance',    type:'Active Effect',   grade:2, costs:[3,4,6,9] }
        ],
        'Air': [
            { name:'Amplification',    type:'Active Effect',   grade:2, costs:[3,4,6,9] },
            { name:'Perception',       type:'Active Effect',   grade:3, costs:[5,7,10,15] },
            { name:'Directional Control',type:'Control Effect',grade:2, costs:[3,4,6,9] },
            { name:'Extensive Control',type:'Control Effect',  grade:6, costs:[7,10,15,20] },
            { name:'Precise Control',  type:'Control Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Ephemerality',     type:'Status Effect',   grade:5, costs:[10,15,20,28] },
            { name:'Levitation',       type:'Control Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Purification',     type:'Status Effect',   grade:1, costs:[1,2,4,6] },
            { name:'Gas Control',      type:'Control Effect',  grade:3, costs:[5,7,10,15] }
        ],
        'Lightning': [
            { name:'Charge',         type:'Passive Effect',     grade:3, costs:[5,7,10,15] },
            { name:'Shock',          type:'Instant Damage',     grade:1, costs:[1,2,4,6] },
            { name:'Discharge',      type:'Area Damage',        grade:3, costs:[5,7,10,15] },
            { name:'Harmful Impulse',type:'Status Effect',      grade:2, costs:[3,4,6,9] },
            { name:'Movement',       type:'Active Effect',      grade:4, costs:[7,10,15,20] },
            { name:'Paralysis',      type:'Status Effect',      grade:3, costs:[5,7,10,15] },
            { name:'Swift Burst',    type:'Sequential Damage',  grade:4, costs:[7,10,15,20] },
            { name:'Reflexes',       type:'Control Effect',     grade:2, costs:[3,4,6,9] },
            { name:'Lightning Strike',type:'Area Damage',       grade:5, costs:[10,15,20,28] }
        ],
        'Ice': [
            { name:'Alteration',      type:'Active Effect',   grade:1, costs:[1,2,4,6] },
            { name:'Frozen Path',     type:'Area Effect',     grade:3, costs:[5,7,10,15] },
            { name:'Freezing',        type:'Instant Damage',  grade:2, costs:[3,4,6,9] },
            { name:'Cold Healing',    type:'Instant Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Frozen Shatter',  type:'Control Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Glacial Expansion',type:'Control Effect', grade:4, costs:[7,10,15,20] },
            { name:'Slowness',        type:'Status Effect',   grade:2, costs:[3,4,6,9] },
            { name:'Snowstorm',       type:'Control Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Temperature',     type:'Passive Effect',  grade:2, costs:[3,4,6,9] }
        ],
        'Gravity': [
            { name:'Barrier',       type:'Active Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Layers',        type:'Control Effect', grade:4, costs:[7,10,15,22] },
            { name:'Fixed',         type:'Active Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Focus',         type:'Control Effect', grade:2, costs:[3,4,6,9] },
            { name:'Free Lightness',type:'Control Effect', grade:2, costs:[3,4,6,9] },
            { name:'Repulsion',     type:'Control Effect', grade:3, costs:[5,7,10,15] },
            { name:'Reverse',       type:'Control Effect', grade:5, costs:[10,15,20,28] },
            { name:'Overloaded',    type:'Active Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Zero',          type:'Active Effect',  grade:2, costs:[3,4,6,9] }
        ],
        'Sound': [
            { name:'Sharp',          type:'Status Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Medium',         type:'Active Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Deep',           type:'Control Effect', grade:3, costs:[5,7,10,15] },
            { name:'Soft',           type:'Status Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Moderate',       type:'Control Effect', grade:1, costs:[1,2,4,6] },
            { name:'Intense',        type:'Control Damage', grade:4, costs:[7,10,15,20] },
            { name:'Musical',        type:'Control Effect', grade:3, costs:[5,7,10,15] },
            { name:'Environmental',  type:'Status Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Specific Effect',type:'Control Effect', grade:1, costs:[1,2,4,6] }
        ],
        'Holy': [
            { name:'Nullification',type:'Active Effect',  grade:5, costs:[10,15,20,28] },
            { name:'Brightness',   type:'Passive Effect', grade:2, costs:[3,4,6,9] },
            { name:'Holy Flame',   type:'Status Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Flash',        type:'Passive Effect', grade:1, costs:[1,2,4,6] },
            { name:'Creation',     type:'Control Effect', grade:4, costs:[7,10,15,20] },
            { name:'Inviolability',type:'Status Effect',  grade:5, costs:[10,15,20,28] },
            { name:'Negation',     type:'Status Effect',  grade:1, costs:[1,2,4,9] },
            { name:'Protection',   type:'Status Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Healing Touch',type:'Status Effect',  grade:2, costs:[3,4,6,9] }
        ],
        'Dark': [
            { name:'Corruption',  type:'DoT Damage',           grade:4, costs:[7,10,15,20] },
            { name:'Debilitation',type:'Status Effect',         grade:2, costs:[3,4,6,9] },
            { name:'Fading',      type:'Status Effect',         grade:1, costs:[1,2,4,6] },
            { name:'Drain',       type:'Status Damage',         grade:5, costs:[10,15,20,28] },
            { name:'Illusions',   type:'Status Effect',         grade:3, costs:[5,7,10,15] },
            { name:'Matter',      type:'Control Effect',        grade:1, costs:[1,2,4,6] },
            { name:'Mold',        type:'Control Effect',        grade:2, costs:[3,4,6,9] },
            { name:'Loss',        type:'Status Effect',         grade:1, costs:[1,2,4,6] },
            { name:'Depths',      type:'Active + Status Effect',grade:3, costs:[5,7,10,15] }
        ],
        'Blood': [
            { name:'Absorption',  type:'Active Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Acceleration',type:'Active Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Healing',     type:'Status Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Detection',   type:'Passive Effect', grade:1, costs:[1,2,4,6] },
            { name:'Manipulation',type:'Control Effect', grade:4, costs:[7,10,15,20] },
            { name:'Morphing',    type:'Control Effect', grade:3, costs:[5,7,10,15] },
            { name:'Purification',type:'Status Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Transfusion', type:'Control Effect', grade:2, costs:[3,4,6,9] },
            { name:'Binding',     type:'Control Effect', grade:4, costs:[7,10,15,20] }
        ],
        'Vine': [
            { name:'Communication',type:'Active Effect',       grade:3, costs:[5,7,10,15] },
            { name:'Call',         type:'Control Damage',       grade:2, costs:[3,4,6,9] },
            { name:'Healing',      type:'Status Effect',        grade:1, costs:[1,2,4,6] },
            { name:'Dominion',     type:'Control Effect',       grade:3, costs:[5,7,10,15] },
            { name:'Entanglement', type:'Control Effect',       grade:2, costs:[3,4,6,9] },
            { name:'Floral',       type:'Control + DoT Effect', grade:3, costs:[5,7,10,15] },
            { name:'Blooming',     type:'Control Effect',       grade:3, costs:[5,7,10,15] },
            { name:'Herbology',    type:'Control Effect',       grade:4, costs:[7,10,15,20] },
            { name:'Regeneration', type:'Active Effect',        grade:2, costs:[3,4,6,9] }
        ],
        'Metal': [
            { name:'Sharpening',   type:'Active Effect',  grade:3, costs:[5,7,10,15] },
            { name:'Enchanting',   type:'Active Effect',  grade:4, costs:[7,10,15,22] },
            { name:'Rust',         type:'Control Effect', grade:5, costs:[1,2,4,6] },
            { name:'Fusion',       type:'Control Effect', grade:3, costs:[3,4,6,9] },
            { name:'Magnetic',     type:'Control Effect', grade:3, costs:[3,4,6,9] },
            { name:'Shaping',      type:'Control Effect', grade:1, costs:[5,7,10,15] },
            { name:'Tempering',    type:'Passive Effect', grade:2, costs:[3,4,6,9] },
            { name:'Transmutation',type:'Control Effect', grade:3, costs:[5,7,10,15] },
            { name:'Swift',        type:'Active Effect',  grade:1, costs:[1,2,4,6] }
        ],
        'Poison': [
            { name:'Touch',        type:'Status Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Projectile',   type:'Active Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Mist',         type:'Control Effect', grade:2, costs:[3,4,6,9] },
            { name:'Control',      type:'Status Effect',  grade:1, costs:[1,2,4,6] },
            { name:'Transmutation',type:'Control Effect', grade:5, costs:[10,15,20,28] },
            { name:'Healing',      type:'Control Damage', grade:2, costs:[3,4,6,9] },
            { name:'Paralysis',    type:'Control Effect', grade:3, costs:[5,7,10,15] },
            { name:'Confusion',    type:'Status Effect',  grade:2, costs:[3,4,6,9] },
            { name:'Weakness',     type:'Control Effect', grade:3, costs:[5,7,10,15] }
        ]
    };

    const QUALITY_NAMES = ['Common','Enhanced','Master','Unique'];

    /* ═══ FIELD IDS ═══ */
    const FIELD_IDS = [
        'characterName','playerName','className','classType','level','characterExp',
        'health','mana','combatPoints','sanity',
        'proficiency','reflex','enchantment','physCritDamage','magicalDamage','control',
        'physicalAttr','magicalAttr','socialAttr','classAttr',
        'agilityValue','strengthValue','enduranceValue','agilityTotal','strengthTotal','enduranceTotal',
        'craftingValue','impactValue','manipulationValue','craftingTotal','impactTotal','manipulationTotal',
        'deceptionValue','performanceValue','confidenceValue','deceptionTotal','performanceTotal','confidenceTotal',
        'dodgeValue','combatValue','mysticValue','dodgeTotal','combatTotal','mysticTotal',
        'armorName','sword1Name','sword2Name','armorValue','sword1Damage','sword2Damage','baseDefense',
        'level1','level2','level3','level4','level5','level10','level15','level20',
        'classTypeBonus','elementCount','inventory',
        'ownedGrades','usedGrades','remainingGrades',
        'bonusTrait1','bonusTrait2','bonusTrait3',
        'race','raceBonus','raceSanity','classSanity',
        'talents','traumas','languages','elementTraitData'
    ];
    const TRACKER_IDS = ['currentHealthLost','currentManaLost','currentCPLost','currentSanityLost'];

    /* ═══ HELPERS ═══ */
    const $=id=>document.getElementById(id);
    function nv(id){const e=$(id);if(!e)return 0;const v=parseFloat(e.value);return isNaN(v)?0:v}
    function sf(id,v){const e=$(id);if(e)e.value=v}
    function sh(id,t){const e=$(id);if(e)e.textContent=t}
    function fl(id){const e=$(id);if(!e)return;e.classList.remove('field-flash');void e.offsetWidth;e.classList.add('field-flash');setTimeout(()=>e.classList.remove('field-flash'),600)}
    function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
    function showToast(m){const t=$('toast'),x=$('toastText');if(!t||!x)return;x.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}

    function getClassDef(){const e=$('className');return(e&&e.value)?CLASS_DATA[e.value]||null:null}
    function getEffType(){const c=getClassDef();if(!c)return null;const b=TYPE_DATA[c.type];if(!b)return null;return c.isKnight?Object.assign({},b,KNIGHT_OV):b}

    /* ═══ SKILLS ═══ */
    const SKILL_MAP=[
        {val:'agilityValue',attr:'physicalAttr',tot:'agilityTotal'},{val:'strengthValue',attr:'physicalAttr',tot:'strengthTotal'},{val:'enduranceValue',attr:'physicalAttr',tot:'enduranceTotal'},
        {val:'craftingValue',attr:'magicalAttr',tot:'craftingTotal'},{val:'impactValue',attr:'magicalAttr',tot:'impactTotal'},{val:'manipulationValue',attr:'magicalAttr',tot:'manipulationTotal'},
        {val:'deceptionValue',attr:'socialAttr',tot:'deceptionTotal'},{val:'performanceValue',attr:'socialAttr',tot:'performanceTotal'},{val:'confidenceValue',attr:'socialAttr',tot:'confidenceTotal'},
        {val:'dodgeValue',attr:'classAttr',tot:'dodgeTotal'},{val:'combatValue',attr:'classAttr',tot:'combatTotal'},{val:'mysticValue',attr:'classAttr',tot:'mysticTotal'}
    ];
    const SP_SKILLS=['agilityValue','strengthValue','enduranceValue','craftingValue','impactValue','manipulationValue','deceptionValue','performanceValue','confidenceValue','dodgeValue','combatValue','mysticValue'];
    const SP_RATE=4.5;

    function recalcSkills(){SKILL_MAP.forEach(s=>{const n=nv(s.val)+nv(s.attr),o=nv(s.tot);sf(s.tot,n);if(n!==o)fl(s.tot)})}
    function recalcSP(){const lv=Math.max(1,nv('level')),tot=lv*SP_RATE,sp=SP_SKILLS.reduce((a,i)=>a+nv(i),0),r=tot-sp;const fmt=n=>(n%1===0)?String(n):n.toFixed(1);sh('spTotal',fmt(tot));sh('spSpent',fmt(sp));sh('spRemain',fmt(r));const re=$('spRemain'),bl=re?re.closest('.sp-block'):null;if(bl){bl.classList.toggle('sp-block-warn',r<0);re.classList.toggle('sp-overspent',r<0)}}

    /* ═══ RESOURCES ═══ */
    function calcHP(){const t=getEffType(),l=Math.max(1,nv('level'));return Math.floor(nv('enduranceTotal')*3+(t?t.healthPerLvl:0)*l+l*2)}
    function calcMP(){const t=getEffType(),l=Math.max(1,nv('level'));return Math.floor(nv('craftingTotal')*1.5+nv('manipulationTotal')*2.5+(t?t.manaPerLvl:0)*l+l*2)}
    function calcCP(){const t=getEffType();return Math.floor(nv('dodgeTotal')*1.3+nv('combatTotal')*1.7+nv('mysticTotal')*1.2+(t?t.cpBase:0))}
    function calcSN(){return Math.floor(nv('classSanity')+nv('raceSanity')+Math.max(1,nv('level'))*2)}

    function calcProf(){const t=getEffType();return+((t?t.baseAtk:0)+nv('combatTotal')*.7).toFixed(2)}
    function calcReflex(){const t=getEffType();return(t?t.baseReflex:0)+nv('dodgeTotal')}
    function calcPhys(){const t=getEffType(),l=Math.max(1,nv('level'));return+(((t?t.atkBonus:0)*l)/2+nv('strengthTotal')/2).toFixed(2)}
    function calcMag(){const t=getEffType(),l=Math.max(1,nv('level'));return+(((t?t.magicBonus:0)*l)/2+nv('impactTotal')/2).toFixed(2)}
    function calcEnch(){const t=getEffType();return+((t?t.enchBase:1)+nv('craftingTotal')*.7).toFixed(2)}
    function calcCtrl(){const t=getEffType();return+((t?t.controlBase:2)+nv('craftingTotal')*3.2).toFixed(2)}

    function updRes(cId,mId,bId,gId,lost){const hMap={healthCurrent:'health',manaCurrent:'mana',cpCurrent:'combatPoints',sanityCurrent:'sanity'};const mx=nv(hMap[cId]||'health'),cur=Math.max(0,mx-lost),pct=mx>0?Math.max(0,Math.min(100,cur/mx*100)):0;sh(cId,cur);sh(mId,mx);const b=$(bId);if(b)b.style.width=pct+'%';const g=$(gId);if(g)g.classList.toggle('resource-low',mx>0&&pct<=25)}

    function recalcAll(){
        recalcSkills();recalcSP();
        sf('proficiency',calcProf());sf('reflex',calcReflex());sf('physCritDamage',calcPhys());sf('magicalDamage',calcMag());sf('enchantment',calcEnch());sf('control',calcCtrl());
        ['proficiency','reflex','physCritDamage','magicalDamage','enchantment','control'].forEach(fl);
        sf('health',calcHP());sf('mana',calcMP());sf('combatPoints',calcCP());sf('sanity',calcSN());
        updRes('healthCurrent','healthMax','healthBar','healthDisplay',nv('currentHealthLost'));
        updRes('manaCurrent','manaMax','manaBar','manaDisplay',nv('currentManaLost'));
        updRes('cpCurrent','cpMax','cpBar','cpDisplay',nv('currentCPLost'));
        updRes('sanityCurrent','sanityMax','sanityBar','sanityDisplay',nv('currentSanityLost'));
        recalcGrades();
    }

    /* ═══ CLASS CHANGE ═══ */
    function onClassChange(){
        const c=getClassDef(),t=getEffType();
        if(!c||!t){['classType','classTypeBonus','elementCount'].forEach(i=>sf(i,''));['classRollBonuses','classElements','classBaseAtk','classBaseReflex'].forEach(i=>sh(i,'—'));const b=$('classInfoBar');if(b)b.classList.remove('visible');renderElementSlots();recalcAll();return}
        sf('classType',c.type);sf('elementCount',c.elCount);
        const p=[];if(t.move>0)p.push('Move +'+t.move);if(t.atkBonus>0)p.push('Atk +'+t.atkBonus);if(t.magicBonus>0)p.push('Magic +'+t.magicBonus);const bs=p.join(' · ')||'None';
        sf('classTypeBonus',bs);sh('classRollBonuses',bs);sh('classElements',c.elDesc||'—');sh('classBaseAtk',t.baseAtk);sh('classBaseReflex',t.baseReflex);
        const b=$('classInfoBar');if(b)b.classList.add('visible');['classType','classTypeBonus','elementCount'].forEach(fl);
        renderElementSlots();recalcAll();
    }

    /* ═══ ADJUST ═══ */
    const ADJ={health:{i:'lostHealth',t:'currentHealthLost',c:'healthCurrent',m:'healthMax',b:'healthBar',g:'healthDisplay'},mana:{i:'lostMana',t:'currentManaLost',c:'manaCurrent',m:'manaMax',b:'manaBar',g:'manaDisplay'},combatPoints:{i:'usedCombatPoints',t:'currentCPLost',c:'cpCurrent',m:'cpMax',b:'cpBar',g:'cpDisplay'},sanity:{i:'lostSanity',t:'currentSanityLost',c:'sanityCurrent',m:'sanityMax',b:'sanityBar',g:'sanityDisplay'}};
    function applyAdj(r){const m=ADJ[r];if(!m)return;const ie=$(m.i);if(!ie)return;const d=parseFloat(ie.value);if(isNaN(d)||d===0){ie.value='';return}const te=$(m.t);if(!te)return;te.value=Math.max(0,(parseFloat(te.value)||0)+d);ie.value='';updRes(m.c,m.m,m.b,m.g,parseFloat(te.value))}

    /* ═══════════════════════════════════════
       ELEMENT SYSTEM
    ═══════════════════════════════════════ */

    // Current trait upgrade state: { "slotIdx:elemName:traitName": tierIndex (0-3) }
    let _traitState = {};
    const MAX_SLOTS = 6;

    function getTraitState() {
        try {
            const raw = ($('elementTraitData') || {}).value;
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveTraitState() {
        sf('elementTraitData', JSON.stringify(_traitState));
    }

    function traitKey(slot, elem, traitName) {
        return slot + ':' + elem + ':' + traitName;
    }

    function getAvailableElements() {
        const cd = getClassDef();
        if (!cd || !cd.allowedCats || cd.allowedCats.length === 0) return [];
        const elems = new Set();
        cd.allowedCats.forEach(cat => {
            const list = ELEM_CATEGORIES[cat];
            if (list) list.forEach(e => elems.add(e));
        });
        return Array.from(elems).sort();
    }

    function renderElementSlots() {
        const container = $('elementSlotsContainer');
        if (!container) return;
        container.innerHTML = '';

        const cd = getClassDef();
        const count = cd ? Math.min(cd.elCount, MAX_SLOTS) : 0;
        const available = getAvailableElements();

        if (count === 0) {
            container.innerHTML = '<p style="font-family:Cormorant Garamond,serif;font-size:.88rem;color:#4a2f18;opacity:.45;font-style:italic;text-align:center;padding:.8rem 0;">No elements available for this class.</p>';
            return;
        }

        for (let i = 0; i < count; i++) {
            const slot = document.createElement('div');
            slot.className = 'elem-slot';
            slot.dataset.slot = i;

            // Header
            const header = document.createElement('div');
            header.className = 'elem-slot-header';

            const num = document.createElement('span');
            num.className = 'elem-slot-number';
            num.textContent = (i + 1);

            const selWrap = document.createElement('div');
            selWrap.className = 'elem-slot-select';
            const sel = document.createElement('select');
            sel.dataset.slotIdx = i;

            const optNone = document.createElement('option');
            optNone.value = '';
            optNone.textContent = '— Select Element —';
            sel.appendChild(optNone);

            available.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e;
                opt.textContent = e;
                sel.appendChild(opt);
            });

            sel.addEventListener('change', function() {
                renderTraitsForSlot(slot, i, this.value);
                recalcGrades();
            });

            selWrap.appendChild(sel);

            const costSpan = document.createElement('span');
            costSpan.className = 'elem-slot-cost';
            costSpan.id = 'elemSlotCost_' + i;
            costSpan.textContent = '';

            const chev = document.createElement('span');
            chev.className = 'elem-slot-chevron';
            chev.innerHTML = '▼';

            header.appendChild(num);
            header.appendChild(selWrap);
            header.appendChild(costSpan);
            header.appendChild(chev);

            header.addEventListener('click', function(e) {
                if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
                slot.classList.toggle('open');
            });

            // Traits panel
            const panel = document.createElement('div');
            panel.className = 'elem-traits-panel';
            panel.id = 'elemPanel_' + i;

            slot.appendChild(header);
            slot.appendChild(panel);
            container.appendChild(slot);
        }
    }

    function renderTraitsForSlot(slotEl, slotIdx, elemName) {
        const panel = $('elemPanel_' + slotIdx);
        if (!panel) return;
        panel.innerHTML = '';

        if (!elemName || !ELEM_DB[elemName]) {
            slotEl.classList.remove('active', 'open');
            updateSlotCost(slotIdx);
            return;
        }

        slotEl.classList.add('active');

        const inner = document.createElement('div');
        inner.className = 'elem-traits-inner';

        const traits = ELEM_DB[elemName];
        const sorted = [...traits].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

        sorted.forEach(trait => {
            const key = traitKey(slotIdx, elemName, trait.name);
            const currentTier = _traitState[key] !== undefined ? _traitState[key] : -1; // -1 = none

            const row = document.createElement('div');
            row.className = 'elem-trait';

            // Info
            const info = document.createElement('div');
            info.className = 'elem-trait-info';

            const gradeLabel = document.createElement('span');
            gradeLabel.className = 'elem-trait-grade';
            gradeLabel.textContent = 'Grade ' + toRoman(trait.grade);

            const nameLabel = document.createElement('span');
            nameLabel.className = 'elem-trait-name';
            nameLabel.textContent = trait.name;

            const typeLabel = document.createElement('span');
            typeLabel.className = 'elem-trait-type';
            typeLabel.textContent = trait.type;

            info.appendChild(gradeLabel);
            info.appendChild(nameLabel);
            info.appendChild(typeLabel);

            // Tier buttons
            const tiers = document.createElement('div');
            tiers.className = 'elem-trait-tiers';

            QUALITY_NAMES.forEach((qName, qi) => {
                const tierRow = document.createElement('div');
                tierRow.className = 'elem-tier-row tier-' + qName.toLowerCase();

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'elem-tier-btn';
                if (qi === currentTier) btn.classList.add('tier-active');
                btn.textContent = qName;
                btn.title = qName + ' — Cost: ' + trait.costs[qi];

                btn.addEventListener('click', function() {
                    if (qi === currentTier) {
                        // Deselect
                        _traitState[key] = -1;
                        delete _traitState[key];
                    } else {
                        _traitState[key] = qi;
                    }
                    saveTraitState();
                    renderTraitsForSlot(slotEl, slotIdx, elemName);
                    recalcGrades();
                });

                const cost = document.createElement('span');
                cost.className = 'elem-tier-cost';
                if (qi === currentTier) cost.classList.add('cost-active');
                cost.textContent = trait.costs[qi];

                tierRow.appendChild(btn);
                tierRow.appendChild(cost);
                tiers.appendChild(tierRow);
            });

            row.appendChild(info);
            row.appendChild(tiers);
            inner.appendChild(row);
        });

        panel.appendChild(inner);
        updateSlotCost(slotIdx);
    }

    function updateSlotCost(slotIdx) {
        let total = 0;
        Object.keys(_traitState).forEach(k => {
            if (!k.startsWith(slotIdx + ':')) return;
            const tier = _traitState[k];
            if (tier < 0) return;
            const parts = k.split(':');
            const elem = parts[1];
            const tName = parts.slice(2).join(':');
            const traits = ELEM_DB[elem];
            if (!traits) return;
            const t = traits.find(tr => tr.name === tName);
            if (t) total += t.costs[tier];
        });

        const el = $('elemSlotCost_' + slotIdx);
        if (el) el.textContent = total > 0 ? total + 'g' : '';
    }

    function recalcGrades() {
        let totalUsed = 0;
        Object.keys(_traitState).forEach(k => {
            const tier = _traitState[k];
            if (tier < 0) return;
            const parts = k.split(':');
            const elem = parts[1];
            const tName = parts.slice(2).join(':');
            const traits = ELEM_DB[elem];
            if (!traits) return;
            const t = traits.find(tr => tr.name === tName);
            if (t) totalUsed += t.costs[tier];
        });

        const owned = nv('ownedGrades');
        const remain = owned - totalUsed;

        sf('usedGrades', totalUsed);
        sf('remainingGrades', remain);
        sh('usedGradesDisplay', totalUsed);
        sh('remainGradesDisplay', remain);

        const remEl = $('remainGradesDisplay');
        const bl = remEl ? remEl.closest('.sp-block') : null;
        if (bl) {
            bl.classList.toggle('sp-block-warn', remain < 0);
            if (remEl) remEl.classList.toggle('sp-overspent', remain < 0);
        }

        // Update each slot cost display
        for (let i = 0; i < MAX_SLOTS; i++) updateSlotCost(i);
    }

    function restoreElementSlots() {
        _traitState = getTraitState();
        const container = $('elementSlotsContainer');
        if (!container) return;
        const slots = container.querySelectorAll('.elem-slot');

        slots.forEach(slot => {
            const idx = parseInt(slot.dataset.slot);
            const sel = slot.querySelector('select');
            if (!sel) return;

            // Find which element was selected for this slot from trait state
            let slotElem = '';
            Object.keys(_traitState).forEach(k => {
                if (k.startsWith(idx + ':')) {
                    const parts = k.split(':');
                    slotElem = parts[1];
                }
            });

            if (slotElem && sel.querySelector('option[value="' + slotElem + '"]')) {
                sel.value = slotElem;
                renderTraitsForSlot(slot, idx, slotElem);
            }
        });

        recalcGrades();
    }

    function toRoman(n) {
        const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
        let r = '';
        map.forEach(([v,s]) => { while (n >= v) { r += s; n -= v; } });
        return r;
    }

    /* ═══ FORM COLLECT/POPULATE/CLEAR ═══ */
    function collect(){const d={};FIELD_IDS.forEach(i=>{const e=$(i);if(e)d[i]=e.value});TRACKER_IDS.forEach(i=>{const e=$(i);if(e)d[i]=e.value});
        // Save element selections
        const con=$('elementSlotsContainer');if(con){const sels=con.querySelectorAll('select');const es={};sels.forEach(s=>{es[s.dataset.slotIdx]=s.value});d._elementSelections=JSON.stringify(es)}
        return d}
    function populate(d){FIELD_IDS.forEach(i=>{const e=$(i);if(e&&d[i]!==undefined)e.value=d[i]});TRACKER_IDS.forEach(i=>{const e=$(i);if(e&&d[i]!==undefined)e.value=d[i]});
        _traitState=getTraitState();
        // Restore element selections after slots render
        if(d._elementSelections){try{const es=JSON.parse(d._elementSelections);const con=$('elementSlotsContainer');if(con){const slots=con.querySelectorAll('.elem-slot');slots.forEach(sl=>{const idx=sl.dataset.slot;const sel=sl.querySelector('select');if(sel&&es[idx]){sel.value=es[idx];renderTraitsForSlot(sl,parseInt(idx),es[idx])}})}}catch(e){}}
    }
    function clearForm(){FIELD_IDS.forEach(i=>{const e=$(i);if(!e)return;e.value=i==='level'?'1':i==='elementTraitData'?'{}':''});TRACKER_IDS.forEach(i=>{const e=$(i);if(e)e.value='0'});const ed=$('editCharacterId');if(ed)ed.value='';const b=$('classInfoBar');if(b)b.classList.remove('visible');_traitState={};saveTraitState();renderElementSlots();recalcAll()}

    /* ═══ LIST ═══ */
    function renderList(){const g=$('charactersGrid'),e=$('emptyState');if(!g||!e)return;const l=getCharacters();g.innerHTML='';if(l.length===0){e.classList.add('visible');g.style.display='none';return}e.classList.remove('visible');g.style.display='grid';l.forEach((c,i)=>{const d=document.createElement('div');d.className='character-card';d.style.cssText='opacity:0;transform:translateY(10px)';const nm=c.characterName||'Unnamed',pl=c.playerName?'Player: '+c.playerName:'',cl=c.className?' · '+c.className:'',tp=c.classType?' ('+c.classType+')':'',lv=c.level?' · Lv.'+c.level:'';d.innerHTML=`<div class="card-info"><div class="card-name">${esc(nm)}</div><div class="card-details">${esc((pl+cl+tp+lv)||'No details')}</div></div><div class="card-actions"><button class="card-action-btn view-btn" data-id="${c.id}">View</button><button class="card-action-btn edit-btn" data-id="${c.id}">Edit</button><button class="card-action-btn delete-btn" data-id="${c.id}">Delete</button></div>`;g.appendChild(d);setTimeout(()=>{d.style.transition='opacity .38s ease, transform .38s ease';d.style.opacity='1';d.style.transform='translateY(0)'},50+i*75)});g.querySelectorAll('.view-btn').forEach(b=>b.addEventListener('click',()=>{location.href='create-character.html?view='+b.dataset.id}));g.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click',()=>{location.href='create-character.html?edit='+b.dataset.id}));g.querySelectorAll('.delete-btn').forEach(b=>b.addEventListener('click',()=>askDel(b.dataset.id)))}
    let _delId=null;
    function askDel(id){_delId=id;const o=$('confirmOverlay');if(o)o.classList.add('active')}
    function doDel(){if(!_delId)return;saveCharacters(getCharacters().filter(c=>c.id!==_delId));_delId=null;$('confirmOverlay').classList.remove('active');renderList()}
    function cancelDel(){_delId=null;const o=$('confirmOverlay');if(o)o.classList.remove('active')}

    function exportJSON(){const b=new Blob([JSON.stringify({heartzlink_characters:getCharacters()},null,2)],{type:'application/json'});const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='heartzlink_characters.json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)}
    function importJSON(f){return new Promise((r,j)=>{const rd=new FileReader();rd.onload=e=>{try{const d=JSON.parse(e.target.result);if(Array.isArray(d.heartzlink_characters)){saveCharacters(d.heartzlink_characters);r(d.heartzlink_characters)}else j(new Error('Bad format'))}catch(er){j(er)}};rd.onerror=()=>j(new Error('Read failed'));rd.readAsText(f)})}
    window.HeartzLinkCharacters={getCharacters,saveCharacters,exportJSON,importJSON};

    /* ═══ INIT MAIN ═══ */
    function initMain(){document.querySelectorAll('.nav-btn').forEach(b=>{b.addEventListener('click',()=>{const p=b.dataset.page;if(p==='create-character')location.href='create-character.html';else if(p==='characters-list'){renderList();$('charactersListOverlay').classList.add('active')}})});const cl=$('closePanelBtn');if(cl)cl.addEventListener('click',()=>$('charactersListOverlay').classList.remove('active'));const lo=$('charactersListOverlay');if(lo)lo.addEventListener('click',e=>{if(e.target===lo)lo.classList.remove('active')});const y=$('confirmYes'),n=$('confirmNo');if(y)y.addEventListener('click',doDel);if(n)n.addEventListener('click',cancelDel);const co=$('confirmOverlay');if(co)co.addEventListener('click',e=>{if(e.target===co)cancelDel()})}

    /* ═══ INIT CREATE ═══ */
    function initCreate(){
        const form=$('characterForm'),clr=$('clearFormBtn'),ed=$('editCharacterId');
        const cs=$('className');if(cs)cs.addEventListener('change',onClassChange);
        const lv=$('level');if(lv)lv.addEventListener('input',recalcAll);
        ['physicalAttr','magicalAttr','socialAttr','classAttr'].forEach(i=>{const e=$(i);if(e)e.addEventListener('input',recalcAll)});
        document.querySelectorAll('.skill-value').forEach(e=>e.addEventListener('input',recalcAll));
        ['raceSanity','classSanity'].forEach(i=>{const e=$(i);if(e)e.addEventListener('input',recalcAll)});
        const og=$('ownedGrades');if(og)og.addEventListener('input',recalcGrades);
        document.querySelectorAll('.adjust-btn').forEach(b=>b.addEventListener('click',()=>applyAdj(b.dataset.target)));
        document.querySelectorAll('.field-adjust').forEach(f=>f.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const w=f.closest('.adjust-wrapper');if(w){const b=w.querySelector('.adjust-btn');if(b)b.click()}}));

        const params=new URLSearchParams(location.search),editId=params.get('edit'),viewId=params.get('view');
        if(editId||viewId){
            const tid=editId||viewId,ch=getCharacters().find(c=>c.id===tid);
            if(ch){
                // First render element slots for the class
                if(ed)ed.value=ch.id;
                // Set class first to generate slots
                if(ch.className){sf('className',ch.className)}
                renderElementSlots();
                populate(ch);
                setTimeout(()=>{onClassChange();
                    // Re-populate after class change re-renders slots
                    populate(ch);
                    restoreElementSlots();
                    recalcAll();
                },80);

                if(viewId){
                    form.querySelectorAll('input:not([type="hidden"]), textarea').forEach(e=>{if(!e.classList.contains('field-locked')&&!e.classList.contains('elem-grade-input')){e.readOnly=true;e.style.opacity='.75';e.style.cursor='default'}});
                    form.querySelectorAll('select').forEach(e=>{e.disabled=true;e.style.opacity='.75'});
                    document.querySelectorAll('.adjust-btn,.field-adjust').forEach(e=>e.style.display='none');
                    document.querySelectorAll('.elem-tier-btn').forEach(b=>{b.style.pointerEvents='none';b.style.opacity='.5'});
                    const sb=form.querySelector('.save-btn');if(sb){sb.querySelector('.btn-label').textContent='Edit Character';sb.querySelector('.btn-icon').textContent='✏️';sb.type='button';sb.addEventListener('click',()=>location.href='create-character.html?edit='+viewId)}
                    if(clr)clr.style.display='none';
                    const ogi=$('ownedGrades');if(ogi){ogi.readOnly=true;ogi.style.opacity='.75'}
                }
            }
        } else {
            renderElementSlots();
            recalcAll();
        }

        if(form)form.addEventListener('submit',e=>{e.preventDefault();saveTraitState();const d=collect(),l=getCharacters(),x=ed?ed.value:'';if(x){const i=l.findIndex(c=>c.id===x);if(i!==-1){d.id=x;d.createdAt=l[i].createdAt;d.updatedAt=new Date().toISOString();l[i]=d;saveCharacters(l);showToast('Character updated!')}}else{d.id=generateId();d.createdAt=new Date().toISOString();d.updatedAt=d.createdAt;l.push(d);saveCharacters(l);if(ed)ed.value=d.id;showToast('Character created!')}});
        if(clr)clr.addEventListener('click',()=>{clearForm();showToast('Form cleared')});
    }

    document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const c=$('confirmOverlay');if(c&&c.classList.contains('active')){cancelDel();return}const l=$('charactersListOverlay');if(l&&l.classList.contains('active'))l.classList.remove('active')});

    document.addEventListener('DOMContentLoaded',()=>{if($('characterForm'))initCreate();if($('charactersListOverlay'))initMain()});
})();