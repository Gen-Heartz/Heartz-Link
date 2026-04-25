/* =============================================
   CLASS-PROGRESSION.JS
   Class definitions, type data, all class
   formulas, stat bonuses, dropdown handling,
   class info bar population.
   No UI layout code.
   ============================================= */

'use strict';

import { $, flashField, showClassInfoBar, setInfoText } from './layout.js';

/* ─── Write helpers ─── */
function sf(id, v) { const el = $(id); if (el) el.value = v; }

/* ═══════════════════════════════════════
   TYPE DATA
   All 13 class types with full stat values.
═══════════════════════════════════════ */
export const TYPE_DATA = {
    'Fast': {
        healthPerLvl:3,  manaPerLvl:2,  cpBase:2,
        baseAtk:2,       baseReflex:4,
        move:2,          atkBonus:1,    magicBonus:0,
        enchBase:1,      controlBase:2
    },
    'Fast+': {
        healthPerLvl:2,  manaPerLvl:3,  cpBase:3,
        baseAtk:1,       baseReflex:4,
        move:2,          atkBonus:0,    magicBonus:1,
        enchBase:1,      controlBase:2
    },
    'Fast++': {
        healthPerLvl:2,  manaPerLvl:2,  cpBase:2,
        baseAtk:1,       baseReflex:5,
        move:3,          atkBonus:0,    magicBonus:0,
        enchBase:1,      controlBase:2
    },
    'Neutral': {
        healthPerLvl:3,  manaPerLvl:2,  cpBase:4,
        baseAtk:2,       baseReflex:1,
        move:0,          atkBonus:1,    magicBonus:2,
        enchBase:2,      controlBase:3
    },
    'Neutral+': {
        healthPerLvl:2,  manaPerLvl:2,  cpBase:4,
        baseAtk:1,       baseReflex:2,
        move:1,          atkBonus:0,    magicBonus:2,
        enchBase:2,      controlBase:3
    },
    'Neutral++': {
        healthPerLvl:2,  manaPerLvl:3,  cpBase:5,
        baseAtk:1,       baseReflex:1,
        move:0,          atkBonus:0,    magicBonus:3,
        enchBase:2,      controlBase:3
    },
    'Strong': {
        healthPerLvl:2,  manaPerLvl:2,  cpBase:2,
        baseAtk:4,       baseReflex:2,
        move:1,          atkBonus:2,    magicBonus:0,
        enchBase:1,      controlBase:2
    },
    'Strong+': {
        healthPerLvl:2,  manaPerLvl:3,  cpBase:3,
        baseAtk:4,       baseReflex:1,
        move:0,          atkBonus:2,    magicBonus:1,
        enchBase:1,      controlBase:2
    },
    'Strong++': {
        healthPerLvl:3,  manaPerLvl:2,  cpBase:2,
        baseAtk:5,       baseReflex:1,
        move:0,          atkBonus:3,    magicBonus:0,
        enchBase:1,      controlBase:2
    },
    'Sorcerer-': {
        healthPerLvl:1,  manaPerLvl:7,  cpBase:5,
        baseAtk:1,       baseReflex:1,
        move:0,          atkBonus:0,    magicBonus:3,
        enchBase:3,      controlBase:4
    },
    'Sorcerer': {
        healthPerLvl:1,  manaPerLvl:8,  cpBase:5,
        baseAtk:1,       baseReflex:2,
        move:1,          atkBonus:0,    magicBonus:3,
        enchBase:3,      controlBase:4
    },
    'Sorcerer+': {
        healthPerLvl:1,  manaPerLvl:9,  cpBase:5,
        baseAtk:1,       baseReflex:3,
        move:2,          atkBonus:0,    magicBonus:3,
        enchBase:3,      controlBase:4
    },
    'Sorcerer++': {
        healthPerLvl:1,  manaPerLvl:10, cpBase:7,
        baseAtk:1,       baseReflex:1,
        move:0,          atkBonus:0,    magicBonus:5,
        enchBase:3,      controlBase:4
    }
};

/* ─── Knight special overrides (merges on top of Strong+) ─── */
export const KNIGHT_OVERRIDES = {
    healthPerLvl:6, manaPerLvl:0,  cpBase:4,
    baseAtk:4,      baseReflex:1,
    move:1,         atkBonus:2,    magicBonus:0,
    enchBase:1,     controlBase:2
};

/* ═══════════════════════════════════════
   CLASS DEFINITIONS
═══════════════════════════════════════ */
export const CLASS_DATA = {
    'Archer':               { type:'Fast+',      elCount:3, elDesc:'Natural + Divergent + Mystic',                 allowedCats:['Natural','Divergent','Mystic'] },
    'Assassin':             { type:'Fast+',      elCount:5, elDesc:'Natural + Mystic + 3 Poison',                  allowedCats:['Natural','Mystic','Poison'] },
    'Berserk':              { type:'Strong',     elCount:5, elDesc:'Natural + Divergent + 3 Blood',                allowedCats:['Natural','Divergent','Blood'] },
    'Blood Hunter':         { type:'Neutral',    elCount:3, elDesc:'Natural + Divergent + Blood',                  allowedCats:['Natural','Divergent','Blood'] },
    'Warlock':              { type:'Sorcerer-',  elCount:3, elDesc:'Natural + Poison',                             allowedCats:['Natural','Poison'] },
    'Hunter':               { type:'Strong+',    elCount:3, elDesc:'Natural + Divergent + Mystic',                 allowedCats:['Natural','Divergent','Mystic'] },
    'Tamer':                { type:'Neutral+',   elCount:3, elDesc:'Natural + Divergent + Mystic',                 allowedCats:['Natural','Divergent','Mystic'] },
    'Duelist':              { type:'Fast',       elCount:2, elDesc:'Natural + Divergent',                          allowedCats:['Natural','Divergent'] },
    'Wielder':              { type:'Fast',       elCount:3, elDesc:'Natural + Divergent + Mystic',                 allowedCats:['Natural','Divergent','Mystic'] },
    'Monk':                 { type:'Neutral',    elCount:5, elDesc:'Natural + Divergent + 3 Holy Traits',          allowedCats:['Natural','Divergent','Holy'] },
    'Necromancer':          { type:'Sorcerer++', elCount:3, elDesc:'Natural + Dark',                               allowedCats:['Natural','Dark'] },
    'Sage':                 { type:'Sorcerer+',  elCount:3, elDesc:'Natural + Divergent + Racial',                 allowedCats:['Natural','Divergent','Mystic','Holy','Dark','Blood','Poison'] },
    'Samurai':              { type:'Fast++',     elCount:4, elDesc:'Natural + Mystic + 3 Blood Traits',            allowedCats:['Natural','Mystic','Blood'] },
    'Knight':               { type:'Strong+',    elCount:0, elDesc:'No Elements',                                  allowedCats:[], isKnight:true },
    'Healer':               { type:'Sorcerer+',  elCount:2, elDesc:'Holy + Natural (restricted)',                  allowedCats:['Holy','Water','Earth','Air','Ice','Vine'] },
    'Demonic Spiritualist': { type:'Neutral+',   elCount:3, elDesc:'Natural + Divergent + Mystic',                 allowedCats:['Natural','Divergent','Mystic'] },
    'Mage':                 { type:'Sorcerer',   elCount:5, elDesc:'Natural + Divergent',                          allowedCats:['Natural','Divergent'] },
    'Battle Mage':          { type:'Neutral++',  elCount:4, elDesc:'Natural + Divergent',                          allowedCats:['Natural','Divergent'] },
    'Paladin':              { type:'Strong++',   elCount:2, elDesc:'Natural + Holy',                               allowedCats:['Natural','Holy'] },
    'Elemental Paladin':    { type:'Strong+',    elCount:3, elDesc:'Natural + Divergent',                          allowedCats:['Natural','Divergent'] },
    'Dark Paladin':         { type:'Strong++',   elCount:2, elDesc:'Natural + Dark',                               allowedCats:['Natural','Dark'] }
};

/* ─── Get CLASS_DATA entry for the currently selected class ─── */
export function getClassDef() {
    const el = $('className');
    return (el && el.value) ? (CLASS_DATA[el.value] || null) : null;
}

/* ─── Get effective type data (Knight receives merged overrides) ─── */
export function getEffectiveType() {
    const cd = getClassDef();
    if (!cd) return null;
    const base = TYPE_DATA[cd.type];
    if (!base) return null;
    return cd.isKnight ? Object.assign({}, base, KNIGHT_OVERRIDES) : base;
}

/* ─── Populate class info bar and locked fields ─── */
export function applyClassData() {
    const cd = getClassDef();
    const td = getEffectiveType();

    if (!cd || !td) {
        ['classType','classTypeBonus','elementCount'].forEach(id => sf(id, ''));
        ['classRollBonuses','classElements','classBaseAtk','classBaseReflex']
            .forEach(id => setInfoText(id, '—'));
        showClassInfoBar(false);
        return;
    }

    sf('classType',    cd.type);
    sf('elementCount', cd.elCount);

    const parts = [];
    if (td.move       > 0) parts.push('Move +'  + td.move);
    if (td.atkBonus   > 0) parts.push('Atk +'   + td.atkBonus);
    if (td.magicBonus > 0) parts.push('Magic +' + td.magicBonus);
    const bonusStr = parts.join(' · ') || 'None';

    sf('classTypeBonus', bonusStr);
    setInfoText('classRollBonuses', bonusStr);
    setInfoText('classElements',    cd.elDesc   || '—');
    setInfoText('classBaseAtk',     String(td.baseAtk));
    setInfoText('classBaseReflex',  String(td.baseReflex));

    showClassInfoBar(true);

    ['classType','classTypeBonus','elementCount'].forEach(flashField);
}

/* ─── Initialize class dropdown listener ─── */
export function initClassProgression(onClassChange) {
    const el = $('className');
    if (el) el.addEventListener('change', onClassChange);
}