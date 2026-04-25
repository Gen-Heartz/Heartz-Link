/* =============================================
   ELEMENTS.JS
   Full elemental system: DB, slot rendering,
   trait selection, tier upgrades, grade costs,
   class-filtered element availability.

   v5 — Official elemental limits enforced:
        maxElements hard cap, allowedCategories
        filtering, bonusCharacteristics as
        bonus-only slots, blockedElements list.
   ============================================= */

'use strict';

import { $, toggleElementSlot } from './layout.js';
import {
    CLASS_DATA,
    resolveAllowedElements
} from './class-progression.js';

/* ─── Write helpers ─── */
function nv(id) { const e = $(id); return e ? (parseFloat(e.value) || 0) : 0; }
function sf(id, v) { const e = $(id); if (e) e.value = v; }
function sh(id, t) { const e = $(id); if (e) e.textContent = t; }

/* ═══════════════════════════════════════════════════
   FIXED UPGRADE COSTS  (characteristic progression)
   Completely separate from spell/mana costs.
═══════════════════════════════════════════════════ */
export const UPGRADE_COST = {
    Common:   1,
    Enhanced: 2,
    Master:   3,
    Unique:   4
};

export const QUALITY_NAMES = ['Common', 'Enhanced', 'Master', 'Unique'];

/* ─── Roman numeral helper ─── */
function toRoman(n) {
    const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let r = '';
    map.forEach(([v, s]) => { while (n >= v) { r += s; n -= v; } });
    return r;
}

const MAX_SLOTS   = 6;   // absolute UI cap — class maxElements is the real limit
const BONUS_COUNT = 3;

/* ═══════════════════════════════════════════════════
   ELEMENT TRAITS DATABASE  (spell costs only)
═══════════════════════════════════════════════════ */
export const ELEM_DB = {
    Fire: [
        { name:'Heat',          type:'Sequential Effect & Status', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Cauterization', type:'Instant Effect',             grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Ashes',         type:'DoT Damage',                 grade:6, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Devour',        type:'Consecutive Damage',         grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Explosion',     type:'Area Damage',                grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Fusion',        type:'Lasting Effect',             grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Illumination',  type:'Passive Effect & Status',    grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Purification',  type:'Status Effect',              grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Burning',       type:'DoT & Status Effect',        grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } }
    ],
    Water: [
        { name:'Dampening',       type:'Control Effect',           grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Hydrotherapy',    type:'Status Effect',            grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Electrification', type:'Control Effect',           grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Fluidity',        type:'Control Effect',           grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Humidification',  type:'Passive + Control Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Neutralization',  type:'Control Effect',           grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Purification',    type:'Status Effect',            grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Reflection',      type:'Instant Effect',           grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Transmutation',   type:'Status Effect',            grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } }
    ],
    Earth: [
        { name:'Granulation',    type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Erosion',        type:'Status Effect',  grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Foundation',     type:'Control Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Immobilization', type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Mimicry',        type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Shaping',        type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Petrification',  type:'Status Effect',  grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } },
        { name:'Regeneration',   type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Resonance',      type:'Active Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } }
    ],
    Air: [
        { name:'Amplification',      type:'Active Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Perception',         type:'Active Effect',  grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Directional Control',type:'Control Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Extensive Control',  type:'Control Effect', grade:6, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Precise Control',    type:'Control Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Ephemerality',       type:'Status Effect',  grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } },
        { name:'Levitation',         type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Purification',       type:'Status Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Gas Control',        type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } }
    ],
    Lightning: [
        { name:'Charge',          type:'Passive Effect',    grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Shock',           type:'Instant Damage',    grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Discharge',       type:'Area Damage',       grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Harmful Impulse', type:'Status Effect',     grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Movement',        type:'Active Effect',     grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Paralysis',       type:'Status Effect',     grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Swift Burst',     type:'Sequential Damage', grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Reflexes',        type:'Control Effect',    grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Lightning Strike',type:'Area Damage',       grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } }
    ],
    Ice: [
        { name:'Alteration',        type:'Active Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Frozen Path',       type:'Area Effect',    grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Freezing',          type:'Instant Damage', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Cold Healing',      type:'Instant Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Frozen Shatter',    type:'Control Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Glacial Expansion', type:'Control Effect', grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Slowness',          type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Snowstorm',         type:'Control Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Temperature',       type:'Passive Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } }
    ],
    Gravity: [
        { name:'Barrier',        type:'Active Effect',  grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Layers',         type:'Control Effect', grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:22 } },
        { name:'Fixed',          type:'Active Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Focus',          type:'Control Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Free Lightness', type:'Control Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Repulsion',      type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Reverse',        type:'Control Effect', grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } },
        { name:'Overloaded',     type:'Active Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Zero',           type:'Active Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } }
    ],
    Sound: [
        { name:'Sharp',          type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Medium',         type:'Active Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Deep',           type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Soft',           type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Moderate',       type:'Control Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Intense',        type:'Control Damage', grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Musical',        type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Environmental',  type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Specific Effect',type:'Control Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } }
    ],
    Holy: [
        { name:'Nullification', type:'Active Effect',  grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } },
        { name:'Brightness',    type:'Passive Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Holy Flame',    type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Flash',         type:'Passive Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Creation',      type:'Control Effect', grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Inviolability', type:'Status Effect',  grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } },
        { name:'Negation',      type:'Status Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:9  } },
        { name:'Protection',    type:'Status Effect',  grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Healing Touch', type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } }
    ],
    Dark: [
        { name:'Corruption',   type:'DoT Damage',            grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Debilitation', type:'Status Effect',          grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Fading',       type:'Status Effect',          grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Drain',        type:'Status Damage',          grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } },
        { name:'Illusions',    type:'Status Effect',          grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Matter',       type:'Control Effect',         grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Mold',         type:'Control Effect',         grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Loss',         type:'Status Effect',          grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Depths',       type:'Active + Status Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } }
    ],
    Blood: [
        { name:'Absorption',   type:'Active Effect',  grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Acceleration', type:'Active Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Healing',      type:'Status Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Detection',    type:'Passive Effect', grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Manipulation', type:'Control Effect', grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Morphing',     type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Purification', type:'Status Effect',  grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Transfusion',  type:'Control Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Binding',      type:'Control Effect', grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } }
    ],
    Vine: [
        { name:'Communication', type:'Active Effect',        grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Call',          type:'Control Damage',        grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Healing',       type:'Status Effect',         grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Dominion',      type:'Control Effect',        grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Entanglement',  type:'Control Effect',        grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Floral',        type:'Control + DoT Effect',  grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Blooming',      type:'Control Effect',        grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Herbology',     type:'Control Effect',        grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:20 } },
        { name:'Regeneration',  type:'Active Effect',         grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } }
    ],
    Metal: [
        { name:'Sharpening',    type:'Active Effect',  grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Enchanting',    type:'Active Effect',  grade:4, spellCost:{Common:7,  Enhanced:10, Master:15, Unique:22 } },
        { name:'Rust',          type:'Control Effect', grade:5, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Fusion',        type:'Control Effect', grade:3, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Magnetic',      type:'Control Effect', grade:3, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Shaping',       type:'Control Effect', grade:1, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Tempering',     type:'Passive Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Transmutation', type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Swift',         type:'Active Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } }
    ],
    Poison: [
        { name:'Touch',         type:'Status Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Projectile',    type:'Active Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Mist',          type:'Control Effect', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Control',       type:'Status Effect',  grade:1, spellCost:{Common:1,  Enhanced:2,  Master:4,  Unique:6  } },
        { name:'Transmutation', type:'Control Effect', grade:5, spellCost:{Common:10, Enhanced:15, Master:20, Unique:28 } },
        { name:'Healing',       type:'Control Damage', grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Paralysis',     type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } },
        { name:'Confusion',     type:'Status Effect',  grade:2, spellCost:{Common:3,  Enhanced:4,  Master:6,  Unique:9  } },
        { name:'Weakness',      type:'Control Effect', grade:3, spellCost:{Common:5,  Enhanced:7,  Master:10, Unique:15 } }
    ]
};

/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
let _traitState = {};   // "slot:elem:traitName" → tierIndex
let _bonusState = {};   // bonusIndex → { name, type, grade, currentTier }

export function getTraitState() {
    try {
        const raw = ($('elementTraitData') || {}).value;
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

export function saveTraitState() {
    const payload = { traits: _traitState, bonus: _bonusState };
    const el = $('elementTraitData');
    if (el) el.value = JSON.stringify(payload);
}

function _loadPersistedState() {
    try {
        const raw = ($('elementTraitData') || {}).value;
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p.traits !== undefined) {
            _traitState = p.traits || {};
            _bonusState = p.bonus  || {};
        } else {
            _traitState = p;
            _bonusState = {};
        }
    } catch (e) {
        _traitState = {};
        _bonusState = {};
    }
}

function traitKey(slot, elem, traitName) {
    return `${slot}:${elem}:${traitName}`;
}

/* ═══════════════════════════════════════════════════
   AVAILABLE ELEMENTS RESOLVER
   Reads allowedCategories + blockedElements from
   the current class definition.
   Returns a sorted array of selectable element names.
═══════════════════════════════════════════════════ */
export function getAvailableElements() {
    const el  = $('className');
    const key = el && el.value ? el.value : '';
    const cd  = CLASS_DATA[key];
    if (!cd) return [];
    return resolveAllowedElements(
        cd.allowedCategories  || [],
        cd.blockedElements    || []
    );
}

/* ─── Count how many main element slots are currently filled ─── */
function _countFilledSlots(container) {
    let count = 0;
    container
        .querySelectorAll('.elem-slot:not(.elem-bonus-slot) select')
        .forEach(sel => { if (sel.value) count++; });
    return count;
}

/* ═══════════════════════════════════════════════════
   GRADE / UPGRADE COST RECALCULATION
═══════════════════════════════════════════════════ */
export function recalcGrades() {
    let totalUsed = 0;

    Object.keys(_traitState).forEach(k => {
        const tierIdx = _traitState[k];
        if (tierIdx < 0) return;
        const tName = QUALITY_NAMES[tierIdx];
        if (tName) totalUsed += UPGRADE_COST[tName];
    });

    Object.values(_bonusState).forEach(b => {
        if (b && b.currentTier >= 0) {
            const tName = QUALITY_NAMES[b.currentTier];
            if (tName) totalUsed += UPGRADE_COST[tName];
        }
    });

    const owned  = nv('ownedGrades');
    const remain = owned - totalUsed;

    sf('usedGrades',      totalUsed);
    sf('remainingGrades', remain);
    sh('usedGradesDisplay',   String(totalUsed));
    sh('remainGradesDisplay', String(remain));

    const remEl   = $('remainGradesDisplay');
    const blockEl = remEl ? remEl.closest('.sp-block') : null;
    const isOver  = remain < 0;
    if (remEl)   remEl.classList.toggle('sp-overspent',    isOver);
    if (blockEl) blockEl.classList.toggle('sp-block-warn', isOver);

    for (let i = 0; i < MAX_SLOTS; i++) _updateSlotCostBadge(i);
}

function _updateSlotCostBadge(slotIdx) {
    let total = 0;
    Object.keys(_traitState).forEach(k => {
        if (!k.startsWith(`${slotIdx}:`)) return;
        const tierIdx = _traitState[k];
        if (tierIdx < 0) return;
        const tName = QUALITY_NAMES[tierIdx];
        if (tName) total += UPGRADE_COST[tName];
    });
    const badge = $(`elemSlotCost_${slotIdx}`);
    if (badge) badge.textContent = total > 0 ? `${total}g` : '';
}

/* ═══════════════════════════════════════════════════
   TRAIT ROW BUILDER  (shared)
═══════════════════════════════════════════════════ */
function _buildTraitRow(name, type, grade, spellCostMap, currentTier, onTierChange) {
    const row = document.createElement('div');
    row.className = 'elem-trait';

    /* Info */
    const info = document.createElement('div');
    info.className = 'elem-trait-info';

    const gradeLabel = document.createElement('span');
    gradeLabel.className   = 'elem-trait-grade';
    gradeLabel.textContent = grade ? `Grade ${toRoman(grade)}` : 'Bonus';

    const nameLabel = document.createElement('span');
    nameLabel.className   = 'elem-trait-name';
    nameLabel.textContent = name || '—';

    const typeLabel = document.createElement('span');
    typeLabel.className   = 'elem-trait-type';
    typeLabel.textContent = type || '';

    info.appendChild(gradeLabel);
    info.appendChild(nameLabel);
    info.appendChild(typeLabel);

    /* Tiers */
    const tiers = document.createElement('div');
    tiers.className = 'elem-trait-tiers';

    QUALITY_NAMES.forEach((qName, qi) => {
        const isActive = qi === currentTier;

        const tierRow = document.createElement('div');
        tierRow.className = `elem-tier-row tier-${qName.toLowerCase()}`;

        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'elem-tier-btn' + (isActive ? ' tier-active' : '');
        btn.textContent = qName;

        const upgCost = document.createElement('span');
        upgCost.className   = 'elem-tier-upgrade-cost';
        upgCost.title       = 'Upgrade cost (grades)';
        upgCost.textContent = `↑${UPGRADE_COST[qName]}g`;

        const spellVal  = spellCostMap ? (spellCostMap[qName] ?? '—') : '—';
        const spellSpan = document.createElement('span');
        spellSpan.className   = 'elem-tier-spell-cost' + (isActive ? ' cost-active' : '');
        spellSpan.title       = 'Spell cost (mana)';
        spellSpan.textContent = `✦${spellVal}`;

        btn.addEventListener('click', () => onTierChange(isActive ? -1 : qi));

        tierRow.appendChild(btn);
        tierRow.appendChild(upgCost);
        tierRow.appendChild(spellSpan);
        tiers.appendChild(tierRow);
    });

    row.appendChild(info);
    row.appendChild(tiers);
    return row;
}

/* ═══════════════════════════════════════════════════
   TRAIT PANEL RENDERER  (element slots)
═══════════════════════════════════════════════════ */
function _renderTraitsForSlot(slotEl, slotIdx, elemName) {
    const panel = $(`elemPanel_${slotIdx}`);
    if (!panel) return;
    panel.innerHTML = '';

    if (!elemName || !ELEM_DB[elemName]) {
        slotEl.classList.remove('active', 'open');
        _updateSlotCostBadge(slotIdx);
        return;
    }

    slotEl.classList.add('active');

    const inner = document.createElement('div');
    inner.className = 'elem-traits-inner';

    const sorted = [...ELEM_DB[elemName]]
        .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

    sorted.forEach(trait => {
        const key         = traitKey(slotIdx, elemName, trait.name);
        const currentTier = (_traitState[key] !== undefined) ? _traitState[key] : -1;

        inner.appendChild(
            _buildTraitRow(
                trait.name, trait.type, trait.grade, trait.spellCost,
                currentTier,
                (newTier) => {
                    if (newTier === -1) { delete _traitState[key]; }
                    else { _traitState[key] = newTier; }
                    saveTraitState();
                    _renderTraitsForSlot(slotEl, slotIdx, elemName);
                    recalcGrades();
                }
            )
        );
    });

    panel.appendChild(inner);
    _updateSlotCostBadge(slotIdx);
}

/* ═══════════════════════════════════════════════════
   SLOT CONTAINER RENDERER
   Hard-enforces maxElements from CLASS_DATA.
   bonusCharacteristics are passed to bonus slots,
   NOT added to main element selection.
═══════════════════════════════════════════════════ */
export function renderElementSlots() {
    const container = $('elementSlotsContainer');
    if (!container) return;
    container.innerHTML = '';

    const classEl   = $('className');
    const className = classEl ? classEl.value : '';
    const cd        = CLASS_DATA[className];

    /* ── No class selected ── */
    if (!cd) {
        _renderBonusSlots(container, {});
        return;
    }

    const maxSlots  = Math.min(cd.maxElements || 0, MAX_SLOTS);
    const available = getAvailableElements();

    /* ── No elements allowed ── */
    if (maxSlots === 0) {
        container.innerHTML = `
            <p style="font-family:Cormorant Garamond,serif;font-size:.88rem;
                      color:#4a2f18;opacity:.45;font-style:italic;
                      text-align:center;padding:.8rem 0;">
                No elemental selection for this class.
            </p>`;
        _renderBonusSlots(container, cd.bonusCharacteristics || {});
        return;
    }

    /* ── Render exactly maxSlots element slots ── */
    for (let i = 0; i < maxSlots; i++) {
        const slot = _buildElementSlot(i, available, maxSlots);
        container.appendChild(slot);
    }

    /* ── Bonus characteristics section ── */
    _renderBonusSlots(container, cd.bonusCharacteristics || {});
}

/* ─── Build one element slot ─── */
function _buildElementSlot(i, available, maxSlots) {
    const slot = document.createElement('div');
    slot.className    = 'elem-slot';
    slot.dataset.slot = i;

    /* Header */
    const header = document.createElement('div');
    header.className = 'elem-slot-header';

    const num = document.createElement('span');
    num.className   = 'elem-slot-number';
    num.textContent = String(i + 1);

    const selWrap = document.createElement('div');
    selWrap.className = 'elem-slot-select';

    const sel = document.createElement('select');
    sel.dataset.slotIdx = i;

    const optNone = document.createElement('option');
    optNone.value       = '';
    optNone.textContent = '— Select Element —';
    sel.appendChild(optNone);

    available.forEach(e => {
        const opt = document.createElement('option');
        opt.value       = e;
        opt.textContent = e;
        sel.appendChild(opt);
    });

    sel.addEventListener('change', function () {
        const container   = $('elementSlotsContainer');
        const filled      = _countFilledSlots(container);
        const otherValues = _getOtherSlotValues(container, i);

        /* Prevent selecting the same element twice */
        if (this.value && otherValues.includes(this.value)) {
            this.value = '';
            _renderTraitsForSlot(slot, i, '');
            recalcGrades();
            return;
        }

        /* Hard cap: if already at max AND this slot was empty, block */
        if (this.value && !_getPreviousValue(slot) && filled >= maxSlots) {
            this.value = '';
            return;
        }

        _renderTraitsForSlot(slot, i, this.value);
        _updateAllSelectDisabledOptions(container, maxSlots);
        recalcGrades();
    });

    selWrap.appendChild(sel);

    const costBadge = document.createElement('span');
    costBadge.className = 'elem-slot-cost';
    costBadge.id        = `elemSlotCost_${i}`;

    const chev = document.createElement('span');
    chev.className = 'elem-slot-chevron';
    chev.innerHTML = '▼';

    header.addEventListener('click', (e) => {
        if (['SELECT','OPTION'].includes(e.target.tagName)) return;
        toggleElementSlot(slot);
    });

    header.appendChild(num);
    header.appendChild(selWrap);
    header.appendChild(costBadge);
    header.appendChild(chev);

    /* Traits panel */
    const panel = document.createElement('div');
    panel.className = 'elem-traits-panel';
    panel.id        = `elemPanel_${i}`;

    slot.appendChild(header);
    slot.appendChild(panel);
    return slot;
}

/* ─── Read the value that a slot previously held (from dataset) ─── */
function _getPreviousValue(slotEl) {
    return slotEl.dataset.prevValue || '';
}

/* ─── Collect values selected in all OTHER element slots ─── */
function _getOtherSlotValues(container, skipIdx) {
    const vals = [];
    container
        .querySelectorAll('.elem-slot:not(.elem-bonus-slot) select')
        .forEach(sel => {
            if (parseInt(sel.dataset.slotIdx) !== skipIdx && sel.value) {
                vals.push(sel.value);
            }
        });
    return vals;
}

/* ─── Disable already-chosen elements across all slots ─── */
function _updateAllSelectDisabledOptions(container, maxSlots) {
    const chosen = [];
    container
        .querySelectorAll('.elem-slot:not(.elem-bonus-slot) select')
        .forEach(sel => { if (sel.value) chosen.push(sel.value); });

    container
        .querySelectorAll('.elem-slot:not(.elem-bonus-slot) select')
        .forEach(sel => {
            /* Update dataset.prevValue for change-event guard */
            sel.dataset.prevValue = sel.value;

            sel.querySelectorAll('option').forEach(opt => {
                if (!opt.value) return;   // keep the placeholder
                opt.disabled = chosen.includes(opt.value) && opt.value !== sel.value;
            });
        });
}

/* ═══════════════════════════════════════════════════
   BONUS CHARACTERISTIC SLOTS
   Driven by bonusCharacteristics map:
   { ElementName: count } → pre-labels the bonus slots
   with the element name and forces their traits to
   come from that element's DB only.
   These are NEVER added to main element selection.
═══════════════════════════════════════════════════ */
function _renderBonusSlots(container, bonusMap) {
    /* bonusMap example: { Poison: 3 } or { Blood: 3 } or {} */
    const bonusEntries = [];

    Object.entries(bonusMap).forEach(([elemName, count]) => {
        for (let n = 0; n < count; n++) {
            bonusEntries.push(elemName);
        }
    });

    /* If no bonus characteristics defined by class, still show 3 free slots */
    const freeCount = BONUS_COUNT - bonusEntries.length;

    const wrapper = document.createElement('div');
    wrapper.className = 'elem-bonus-section';

    const hdr = document.createElement('div');
    hdr.className = 'elem-bonus-header';
    hdr.innerHTML = `
        <span class="skill-block-tag"
              style="position:relative;top:0;left:0;
                     display:inline-block;margin-bottom:.4rem;">
            Bonus Characteristics
        </span>`;
    wrapper.appendChild(hdr);

    /* Locked bonus slots (from class rule e.g. Poison x3) */
    bonusEntries.forEach((elemName, bi) => {
        const saved  = _bonusState[bi] || { name:'', type:'', grade:0, currentTier:-1 };
        const slotEl = _buildLockedBonusSlot(bi, elemName, saved);
        wrapper.appendChild(slotEl);
    });

    /* Free bonus slots */
    for (let fi = 0; fi < freeCount; fi++) {
        const bi     = bonusEntries.length + fi;
        const saved  = _bonusState[bi] || { name:'', type:'', grade:0, currentTier:-1 };
        const slotEl = _buildFreeBonusSlot(bi, saved);
        wrapper.appendChild(slotEl);
    }

    container.appendChild(wrapper);
}

/* ─── Locked bonus slot (element fixed by class rule) ─── */
function _buildLockedBonusSlot(bi, elemName, saved) {
    const slot = document.createElement('div');
    slot.className     = 'elem-slot elem-bonus-slot';
    slot.dataset.bonus = bi;

    /* Header */
    const header = document.createElement('div');
    header.className = 'elem-slot-header elem-bonus-slot-header';

    const num = document.createElement('span');
    num.className   = 'elem-slot-number';
    num.textContent = `B${bi + 1}`;

    const label = document.createElement('span');
    label.className   = 'elem-bonus-fixed-label';
    label.textContent = `${elemName} (Bonus)`;

    const costBadge = document.createElement('span');
    costBadge.className = 'elem-slot-cost';
    costBadge.id        = `bonusSlotCost_${bi}`;

    const chev = document.createElement('span');
    chev.className = 'elem-slot-chevron';
    chev.innerHTML = '▼';

    header.addEventListener('click', (e) => {
        if (['INPUT','SELECT','OPTION'].includes(e.target.tagName)) return;
        toggleElementSlot(slot);
    });

    header.appendChild(num);
    header.appendChild(label);
    header.appendChild(costBadge);
    header.appendChild(chev);

    /* Detail: name input (free-form label) + grade */
    const detailRow = document.createElement('div');
    detailRow.className = 'elem-bonus-details';

    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.className   = 'field-input elem-bonus-name';
    nameInput.placeholder = `${elemName} characteristic name...`;
    nameInput.value       = saved.name || '';
    nameInput.addEventListener('input', () => _syncBonusState(bi, slot));

    const gradeInput = document.createElement('input');
    gradeInput.type        = 'number';
    gradeInput.className   = 'field-input field-num elem-bonus-grade';
    gradeInput.placeholder = 'Grade';
    gradeInput.min         = 0;
    gradeInput.max         = 10;
    gradeInput.value       = saved.grade || '';
    gradeInput.addEventListener('input', () => _syncBonusState(bi, slot));

    detailRow.appendChild(nameInput);
    detailRow.appendChild(gradeInput);

    /* Traits panel — uses the locked element's DB traits */
    const panel = document.createElement('div');
    panel.className = 'elem-traits-panel';
    panel.id        = `bonusPanel_${bi}`;

    const inner = document.createElement('div');
    inner.className = 'elem-traits-inner';

    /* Render element DB traits for this bonus element */
    const elemTraits = ELEM_DB[elemName] || [];
    const sorted     = [...elemTraits].sort((a,b) => a.grade - b.grade || a.name.localeCompare(b.name));

    sorted.forEach(trait => {
        const key         = `bonus_${bi}:${elemName}:${trait.name}`;
        const currentTier = (_traitState[key] !== undefined) ? _traitState[key] : -1;

        inner.appendChild(
            _buildTraitRow(
                trait.name, trait.type, trait.grade, trait.spellCost,
                currentTier,
                (newTier) => {
                    if (newTier === -1) { delete _traitState[key]; }
                    else { _traitState[key] = newTier; }
                    saveTraitState();
                    /* Re-render this inner panel */
                    inner.innerHTML = '';
                    sorted.forEach(t => {
                        const k2   = `bonus_${bi}:${elemName}:${t.name}`;
                        const cur2 = (_traitState[k2] !== undefined) ? _traitState[k2] : -1;
                        inner.appendChild(
                            _buildTraitRow(t.name, t.type, t.grade, t.spellCost, cur2,
                                (nt) => {
                                    if (nt === -1) delete _traitState[k2];
                                    else _traitState[k2] = nt;
                                    saveTraitState();
                                    recalcGrades();
                                }
                            )
                        );
                    });
                    recalcGrades();
                }
            )
        );
    });

    panel.appendChild(inner);
    slot.appendChild(header);
    slot.appendChild(detailRow);
    slot.appendChild(panel);

    _updateBonusCostBadge(bi);
    return slot;
}

/* ─── Free bonus slot (no class-locked element) ─── */
function _buildFreeBonusSlot(bi, saved) {
    const slot = document.createElement('div');
    slot.className     = 'elem-slot elem-bonus-slot';
    slot.dataset.bonus = bi;

    const header = document.createElement('div');
    header.className = 'elem-slot-header elem-bonus-slot-header';

    const num = document.createElement('span');
    num.className   = 'elem-slot-number';
    num.textContent = `B${bi + 1}`;

    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.className   = 'field-input elem-bonus-name';
    nameInput.placeholder = 'Characteristic name...';
    nameInput.value       = saved.name || '';
    nameInput.addEventListener('input', () => _syncBonusState(bi, slot));

    const costBadge = document.createElement('span');
    costBadge.className = 'elem-slot-cost';
    costBadge.id        = `bonusSlotCost_${bi}`;

    const chev = document.createElement('span');
    chev.className = 'elem-slot-chevron';
    chev.innerHTML = '▼';

    header.addEventListener('click', (e) => {
        if (['INPUT','SELECT','OPTION'].includes(e.target.tagName)) return;
        toggleElementSlot(slot);
    });

    header.appendChild(num);
    header.appendChild(nameInput);
    header.appendChild(costBadge);
    header.appendChild(chev);

    const detailRow = document.createElement('div');
    detailRow.className = 'elem-bonus-details';

    const typeInput = document.createElement('input');
    typeInput.type        = 'text';
    typeInput.className   = 'field-input elem-bonus-type';
    typeInput.placeholder = 'Effect type...';
    typeInput.value       = saved.type || '';
    typeInput.addEventListener('input', () => _syncBonusState(bi, slot));

    const gradeInput = document.createElement('input');
    gradeInput.type        = 'number';
    gradeInput.className   = 'field-input field-num elem-bonus-grade';
    gradeInput.placeholder = 'Grade';
    gradeInput.min         = 0;
    gradeInput.max         = 10;
    gradeInput.value       = saved.grade || '';
    gradeInput.addEventListener('input', () => _syncBonusState(bi, slot));

    detailRow.appendChild(typeInput);
    detailRow.appendChild(gradeInput);

    const panel = document.createElement('div');
    panel.className = 'elem-traits-panel';
    panel.id        = `bonusPanel_${bi}`;

    const inner = document.createElement('div');
    inner.className = 'elem-traits-inner';
    inner.appendChild(_buildBonusTierRow(bi, saved.currentTier ?? -1, slot));
    panel.appendChild(inner);

    slot.appendChild(header);
    slot.appendChild(detailRow);
    slot.appendChild(panel);

    _updateBonusCostBadge(bi);
    return slot;
}

/* ─── Tier row for a free bonus slot ─── */
function _buildBonusTierRow(bi, currentTier, slotEl) {
    const row = document.createElement('div');
    row.className = 'elem-trait';

    const info = document.createElement('div');
    info.className = 'elem-trait-info';
    const qualLabel = document.createElement('span');
    qualLabel.className   = 'elem-trait-grade';
    qualLabel.textContent = currentTier >= 0 ? QUALITY_NAMES[currentTier] : 'Not acquired';
    info.appendChild(qualLabel);

    const tiers = document.createElement('div');
    tiers.className = 'elem-trait-tiers';

    QUALITY_NAMES.forEach((qName, qi) => {
        const isActive = qi === currentTier;
        const tierRow  = document.createElement('div');
        tierRow.className = `elem-tier-row tier-${qName.toLowerCase()}`;

        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'elem-tier-btn' + (isActive ? ' tier-active' : '');
        btn.textContent = qName;

        const upgCost = document.createElement('span');
        upgCost.className   = 'elem-tier-upgrade-cost';
        upgCost.title       = 'Upgrade cost (grades)';
        upgCost.textContent = `↑${UPGRADE_COST[qName]}g`;

        const spellSpan = document.createElement('span');
        spellSpan.className   = 'elem-tier-spell-cost' + (isActive ? ' cost-active' : '');
        spellSpan.title       = 'Spell cost (mana)';
        spellSpan.textContent = '✦—';

        btn.addEventListener('click', () => {
            const newTier = isActive ? -1 : qi;
            _bonusState[bi] = Object.assign({}, _bonusState[bi] || {}, { currentTier: newTier });
            saveTraitState();

            const panel = $(`bonusPanel_${bi}`);
            if (panel) {
                const inner = panel.querySelector('.elem-traits-inner');
                if (inner) {
                    inner.innerHTML = '';
                    inner.appendChild(_buildBonusTierRow(bi, newTier, slotEl));
                }
            }

            _updateBonusCostBadge(bi);
            recalcGrades();
        });

        tierRow.appendChild(btn);
        tierRow.appendChild(upgCost);
        tierRow.appendChild(spellSpan);
        tiers.appendChild(tierRow);
    });

    row.appendChild(info);
    row.appendChild(tiers);
    return row;
}

/* ─── Sync free bonus slot state from inputs ─── */
function _syncBonusState(bi, slotEl) {
    const nameEl  = slotEl.querySelector('.elem-bonus-name');
    const typeEl  = slotEl.querySelector('.elem-bonus-type');
    const gradeEl = slotEl.querySelector('.elem-bonus-grade');

    _bonusState[bi] = Object.assign({}, _bonusState[bi] || { currentTier: -1 }, {
        name:  nameEl  ? nameEl.value                  : '',
        type:  typeEl  ? typeEl.value                  : '',
        grade: gradeEl ? parseInt(gradeEl.value) || 0  : 0
    });

    saveTraitState();
}

/* ─── Bonus cost badge ─── */
function _updateBonusCostBadge(bi) {
    const b     = _bonusState[bi];
    let   total = 0;
    if (b && b.currentTier >= 0) {
        const tName = QUALITY_NAMES[b.currentTier];
        if (tName) total = UPGRADE_COST[tName];
    }
    const badge = $(`bonusSlotCost_${bi}`);
    if (badge) badge.textContent = total > 0 ? `${total}g` : '';
}

/* ═══════════════════════════════════════════════════
   RESTORE ELEMENT SELECTIONS  (load from save)
═══════════════════════════════════════════════════ */
export function restoreElementSlots(savedSelections) {
    _loadPersistedState();

    const container = $('elementSlotsContainer');
    if (!container) return;

    /* Restore main element selections */
    container
        .querySelectorAll('.elem-slot:not(.elem-bonus-slot)')
        .forEach(slot => {
            const idx = parseInt(slot.dataset.slot);
            const sel = slot.querySelector('select');
            if (!sel) return;
            const elemName = savedSelections ? (savedSelections[idx] || '') : '';
            if (elemName && sel.querySelector(`option[value="${elemName}"]`)) {
                sel.value             = elemName;
                sel.dataset.prevValue = elemName;
                _renderTraitsForSlot(slot, idx, elemName);
            }
        });

    /* Re-disable duplicates after restore */
    const classEl   = $('className');
    const className = classEl ? classEl.value : '';
    const cd        = CLASS_DATA[className];
    if (cd) _updateAllSelectDisabledOptions(container, cd.maxElements || 0);

    /* Restore bonus slot values */
    container
        .querySelectorAll('.elem-bonus-slot')
        .forEach(slot => {
            const bi    = parseInt(slot.dataset.bonus);
            const saved = _bonusState[bi];
            if (!saved) return;

            const nameEl  = slot.querySelector('.elem-bonus-name');
            const typeEl  = slot.querySelector('.elem-bonus-type');
            const gradeEl = slot.querySelector('.elem-bonus-grade');
            if (nameEl  && saved.name  !== undefined) nameEl.value  = saved.name;
            if (typeEl  && saved.type  !== undefined) typeEl.value  = saved.type;
            if (gradeEl && saved.grade !== undefined) gradeEl.value = saved.grade;

            const panel = $(`bonusPanel_${bi}`);
            if (panel) {
                const inner = panel.querySelector('.elem-traits-inner');
                if (inner) {
                    inner.innerHTML = '';
                    inner.appendChild(_buildBonusTierRow(bi, saved.currentTier ?? -1, slot));
                }
            }

            _updateBonusCostBadge(bi);
        });

    recalcGrades();
}

/* ─── Initialize owned-grades input ─── */
export function initElements() {
    const og = $('ownedGrades');
    if (og) og.addEventListener('input', recalcGrades);
}

/* ─── Collect element slot selections for save ─── */
export function collectElementSelections() {
    const container = $('elementSlotsContainer');
    if (!container) return {};
    const result = {};
    container.querySelectorAll('select[data-slot-idx]').forEach(sel => {
        result[sel.dataset.slotIdx] = sel.value;
    });
    return result;
}

/* ─── Load trait state from external data ─── */
export function loadTraitState(state) {
    if (state && state.traits !== undefined) {
        _traitState = state.traits || {};
        _bonusState = state.bonus  || {};
    } else {
        _traitState = state || {};
        _bonusState = {};
    }
    saveTraitState();
}