/* =============================================
   CLASS-PROGRESSION.JS
   Class definitions, type data, all class
   formulas, stat bonuses, dropdown handling,
   class info bar population.

   v2 — Official elemental rules enforced:
        maxElements, allowedCategories,
        bonusCharacteristics, blockedElements
   ============================================= */

'use strict';

import { $, flashField, showClassInfoBar, setInfoText } from './layout.js';

/* ─── Write helper ─── */
function sf(id, v) { const el = $(id); if (el) el.value = v; }

/* ═══════════════════════════════════════════════════
   OFFICIAL ELEMENT CLASSIFICATION
   These are the four canonical categories.
   Racial = Blood, Poison, Vine, Metal
   Mystic = Holy, Dark
═══════════════════════════════════════════════════ */
export const ELEMENT_CATEGORIES = {
    Natural:   ['Fire', 'Water', 'Earth', 'Air'],
    Divergent: ['Lightning', 'Ice', 'Gravity', 'Sound'],
    Racial:    ['Blood', 'Poison', 'Vine', 'Metal'],
    Mystic:    ['Holy', 'Dark']
};

/* ─── Flat list of every element per category (for quick lookup) ─── */
export const ALL_ELEMENTS_BY_CATEGORY = ELEMENT_CATEGORIES;

/* ─── Resolve a category name to its element list ─── */
export function getElementsInCategory(cat) {
    return ELEMENT_CATEGORIES[cat] ? [...ELEMENT_CATEGORIES[cat]] : [];
}

/* ─── Build a deduplicated, sorted element list from category names ─── */
export function resolveAllowedElements(allowedCategories, blockedElements = []) {
    const set = new Set();
    (allowedCategories || []).forEach(cat => {
        (ELEMENT_CATEGORIES[cat] || []).forEach(e => {
            if (!blockedElements.includes(e)) set.add(e);
        });
    });
    return Array.from(set).sort();
}

/* ═══════════════════════════════════════════════════
   TYPE DATA  (13 types — unchanged)
═══════════════════════════════════════════════════ */
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

/* ─── Knight special overrides ─── */
export const KNIGHT_OVERRIDES = {
    healthPerLvl:6, manaPerLvl:0,  cpBase:4,
    baseAtk:4,      baseReflex:1,
    move:1,         atkBonus:2,    magicBonus:0,
    enchBase:1,     controlBase:2
};

/* ═══════════════════════════════════════════════════
   CLASS DEFINITIONS  —  Official elemental rules

   Each class entry contains:

   type               — class type key (maps to TYPE_DATA)
   isKnight           — triggers KNIGHT_OVERRIDES

   maxElements        — hard cap on main element slots
   allowedCategories  — category names whose elements may
                        be chosen as main elements
   blockedElements    — individual elements explicitly
                        forbidden even if their category
                        is listed (e.g. Healer: no Fire)

   bonusCharacteristics — { ElementName: count }
                          These are bonus-slot only.
                          The element does NOT appear
                          in main selection dropdowns.

   elDesc             — human-readable description shown
                        in the class info bar
═══════════════════════════════════════════════════ */
export const CLASS_DATA = {

    /* ── Available classes ─────────────────────── */

    Archer: {
        type:              'Fast+',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent', 'Mystic'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent + Mystic'
    },

    Assassin: {
        type:              'Fast+',
        maxElements:       2,
        allowedCategories: ['Natural', 'Mystic'],
        blockedElements:   [],
        bonusCharacteristics: { Poison: 3 },
        elDesc: 'Choose 2 from Natural + Mystic  |  +3 Poison bonus'
    },

    Berserk: {
        type:              'Strong',
        maxElements:       2,
        allowedCategories: ['Natural', 'Divergent'],
        blockedElements:   [],
        bonusCharacteristics: { Blood: 3 },
        elDesc: 'Choose 2 from Natural + Divergent  |  +3 Blood bonus'
    },

    'Blood Hunter': {
        type:              'Neutral',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent', 'Racial'],
        /* Blood IS selectable; block the other Racial elements */
        blockedElements:   ['Poison', 'Vine', 'Metal'],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent + Blood'
    },

    Warlock: {
        type:              'Sorcerer-',
        maxElements:       3,
        allowedCategories: ['Natural', 'Racial'],
        blockedElements:   ['Blood', 'Vine', 'Metal'],   // only Poison from Racial
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Poison'
    },

    Hunter: {
        type:              'Strong+',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent', 'Mystic'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent + Mystic'
    },

    Tamer: {
        type:              'Neutral+',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent', 'Mystic'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent + Mystic'
    },

    Duelist: {
        type:              'Fast',
        maxElements:       2,
        allowedCategories: ['Natural', 'Divergent'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 2 from Natural + Divergent'
    },

    Handler: {
        type:              'Fast',
        maxElements:       2,
        allowedCategories: ['Natural', 'Divergent', 'Mystic'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 2 from Natural + Divergent + Mystic'
    },

    Wielder: {
        type:              'Fast',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent', 'Mystic'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent + Mystic'
    },

    Monk: {
        type:              'Neutral',
        maxElements:       2,
        allowedCategories: ['Natural', 'Divergent'],
        blockedElements:   [],
        bonusCharacteristics: { Holy: 3 },
        elDesc: 'Choose 2 from Natural + Divergent  |  +3 Holy bonus'
    },

    Necromancer: {
        type:              'Sorcerer++',
        maxElements:       3,
        allowedCategories: ['Natural', 'Mystic'],
        blockedElements:   ['Holy'],     // only Dark from Mystic
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Dark'
    },

    Sage: {
        type:              'Sorcerer+',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent', 'Racial'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent + Racial'
    },

    Samurai: {
        type:              'Fast++',
        maxElements:       1,
        allowedCategories: ['Natural', 'Mystic'],
        blockedElements:   ['Dark'],     // only Holy from Mystic? spec says Natural+Mystic
        bonusCharacteristics: { Blood: 3 },
        elDesc: 'Choose 1 from Natural + Mystic  |  +3 Blood bonus'
    },

    /* ── Extended classes ──────────────────────── */

    Knight: {
        type:              'Strong+',
        isKnight:          true,
        maxElements:       0,
        allowedCategories: [],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'No elemental selection'
    },

    Healer: {
        type:              'Sorcerer+',
        maxElements:       2,
        allowedCategories: ['Natural', 'Divergent', 'Mystic'],
        /*
         * Natural allowed EXCEPT Fire.
         * Divergent allowed EXCEPT Lightning.
         * Only Holy from Mystic (block Dark).
         * Blood and Poison never available.
         */
        blockedElements:   ['Fire', 'Lightning', 'Dark', 'Blood', 'Poison', 'Vine', 'Metal'],
        bonusCharacteristics: {},
        elDesc: 'Choose 2 — Holy / Natural (no Fire) / Divergent (no Lightning)'
    },

    'Demonic Spiritualist': {
        type:              'Neutral+',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent', 'Mystic'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent + Mystic'
    },

    Mage: {
        type:              'Sorcerer',
        maxElements:       5,
        allowedCategories: ['Natural', 'Divergent'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 5 from Natural + Divergent'
    },

    'Battle Mage': {
        type:              'Neutral++',
        maxElements:       4,
        allowedCategories: ['Natural', 'Divergent'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 4 from Natural + Divergent'
    },

    Paladin: {
        type:              'Strong++',
        maxElements:       2,
        allowedCategories: ['Natural', 'Mystic'],
        blockedElements:   ['Dark'],     // only Holy from Mystic
        bonusCharacteristics: {},
        elDesc: 'Choose 2 from Natural + Holy'
    },

    'Elemental Paladin': {
        type:              'Strong+',
        maxElements:       3,
        allowedCategories: ['Natural', 'Divergent'],
        blockedElements:   [],
        bonusCharacteristics: {},
        elDesc: 'Choose 3 from Natural + Divergent'
    },

    'Dark Paladin': {
        type:              'Strong++',
        maxElements:       2,
        allowedCategories: ['Natural', 'Mystic'],
        blockedElements:   ['Holy'],     // only Dark from Mystic
        bonusCharacteristics: {},
        elDesc: 'Choose 2 from Natural + Dark'
    }
};

/* ─── Get CLASS_DATA entry for the currently selected class ─── */
export function getClassDef() {
    const el = $('className');
    return (el && el.value) ? (CLASS_DATA[el.value] || null) : null;
}

/* ─── Effective type (Knight merges overrides) ─── */
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
        ['classType', 'classTypeBonus', 'elementCount'].forEach(id => sf(id, ''));
        ['classRollBonuses', 'classElements', 'classBaseAtk', 'classBaseReflex']
            .forEach(id => setInfoText(id, '—'));
        showClassInfoBar(false);
        return;
    }

    sf('classType',    cd.type);
    sf('elementCount', cd.maxElements);

    const parts = [];
    if (td.move       > 0) parts.push('Move +'  + td.move);
    if (td.atkBonus   > 0) parts.push('Atk +'   + td.atkBonus);
    if (td.magicBonus > 0) parts.push('Magic +' + td.magicBonus);
    const bonusStr = parts.join(' · ') || 'None';

    sf('classTypeBonus', bonusStr);
    setInfoText('classRollBonuses', bonusStr);
    setInfoText('classElements',    cd.elDesc        || '—');
    setInfoText('classBaseAtk',     String(td.baseAtk));
    setInfoText('classBaseReflex',  String(td.baseReflex));

    showClassInfoBar(true);

    ['classType', 'classTypeBonus', 'elementCount'].forEach(flashField);
}

/* ─── Initialize class dropdown listener ─── */
export function initClassProgression(onClassChange) {
    const el = $('className');
    if (el) el.addEventListener('change', onClassChange);
}