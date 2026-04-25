/* =============================================
   CORE-RESOURCES.JS
   Total HP, Mana, Combat Points, Sanity,
   Lost/Used tracking, and all derived
   attributes: Proficiency, Reflex,
   Phys/Crit Damage, Magical Damage,
   Enchantment, Control.
   ============================================= */

'use strict';

import { $, flashField, setBarWidth, setResourceLowState } from './layout.js';
import { getEffectiveType }                                 from './class-progression.js';
import { getSkillTotal }                                    from './skills.js';

/* ─── Read numeric value from a field ─── */
function nv(id) {
    const el = $(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
}

/* ─── Write value to a field ─── */
function sf(id, v) {
    const el = $(id);
    if (el) el.value = v;
}

/* ─── Write text content ─── */
function sh(id, t) {
    const el = $(id);
    if (el) el.textContent = t;
}

/* ═══════════════════════════════════════
   RESOURCE MAX CALCULATIONS
═══════════════════════════════════════ */

/*
 * Health = (EnduranceTotal × 3)
 *          + (healthPerLvl × level)
 *          + (level × 2)
 */
export function calcMaxHealth() {
    const td = getEffectiveType();
    const lv = Math.max(1, nv('level'));
    const hPL = td ? td.healthPerLvl : 0;
    return Math.floor(getSkillTotal('endurance') * 3 + hPL * lv + lv * 2);
}

/*
 * Mana = (CraftingTotal × 1.5)
 *        + (ManipulationTotal × 2.5)
 *        + (manaPerLvl × level)
 *        + (level × 2)
 */
export function calcMaxMana() {
    const td  = getEffectiveType();
    const lv  = Math.max(1, nv('level'));
    const mPL = td ? td.manaPerLvl : 0;
    return Math.floor(
        getSkillTotal('crafting')    * 1.5 +
        getSkillTotal('manipulation')* 2.5 +
        mPL * lv +
        lv  * 2
    );
}

/*
 * Combat Points (no level scaling — fixed cpBase - dividido pela metade o valor que cada pericia contribui)
 * = (DodgeTotal × 0.65)
 *   + (CombatTotal × 0.85)
 *   + (MysticTotal × 0.6)
 *   + cpBase
 */
export function calcMaxCombatPoints() {
    const td  = getEffectiveType();
    const cpB = td ? td.cpBase : 0;
    return Math.floor(
        getSkillTotal('dodge')  * 0.65 +
        getSkillTotal('combat') * 0.85 +
        getSkillTotal('mystic') * 0.6 +
        cpB
    );
}

/*
 * Sanity = classSanity + raceSanity + (level × 2)
 */
export function calcMaxSanity() {
    const lv = Math.max(1, nv('level'));
    return Math.floor(nv('classSanity') + nv('raceSanity') + lv * 2);
}

/* ═══════════════════════════════════════
   DERIVED ATTRIBUTE CALCULATIONS
═══════════════════════════════════════ */

// Proficiency = baseAtk + (combatTotal × 0.7)
export function calcProficiency() {
    const td = getEffectiveType();
    const ba = td ? td.baseAtk : 0;
    return parseFloat((ba + getSkillTotal('combat') * 0.7).toFixed(2));
}

// Reflex = baseReflex + dodgeTotal
export function calcReflex() {
    const td = getEffectiveType();
    const br = td ? td.baseReflex : 0;
    return br + getSkillTotal('dodge');
}

// Phys/Crit Damage = ((atkBonus × level) / 2) + (strengthTotal / 2)
export function calcPhysCritDamage() {
    const td  = getEffectiveType();
    const lv  = Math.max(1, nv('level'));
    const atk = td ? td.atkBonus : 0;
    return parseFloat(((atk * lv) / 2 + getSkillTotal('strength') / 2).toFixed(2));
}

// Magical Damage = ((magicBonus × level) / 2) + (impactTotal / 2)
export function calcMagicalDamage() {
    const td = getEffectiveType();
    const lv = Math.max(1, nv('level'));
    const mg = td ? td.magicBonus : 0;
    return parseFloat(((mg * lv) / 2 + getSkillTotal('impact') / 2).toFixed(2));
}

// Enchantment = enchBase + (craftingTotal × 0.7)
export function calcEnchantment() {
    const td = getEffectiveType();
    const eb = td ? td.enchBase : 1;
    return parseFloat((eb + getSkillTotal('crafting') * 0.7).toFixed(2));
}

// Control = controlBase + (craftingTotal × 3.2)
export function calcControl() {
    const td = getEffectiveType();
    const cb = td ? td.controlBase : 2;
    return parseFloat((cb + getSkillTotal('crafting') * 3.2).toFixed(2));
}

/* ═══════════════════════════════════════
   RESOURCE DISPLAY UPDATER
═══════════════════════════════════════ */

const RESOURCE_HIDDEN_MAP = {
    healthCurrent:  'health',
    manaCurrent:    'mana',
    cpCurrent:      'combatPoints',
    sanityCurrent:  'sanity'
};

export function updateResourceDisplay(currentId, maxTextId, barId, groupId, lost) {
    const hiddenKey = RESOURCE_HIDDEN_MAP[currentId] || 'health';
    const max     = nv(hiddenKey);
    const current = Math.max(0, max - lost);
    const pct     = max > 0 ? (current / max) * 100 : 0;

    sh(currentId,  current);
    sh(maxTextId,  max);
    setBarWidth(barId, pct);
    setResourceLowState(groupId, max > 0 && pct <= 25);
}

/* ═══════════════════════════════════════
   APPLY RESOURCE ADJUSTMENT
   (+ = lose resource, − = restore)
═══════════════════════════════════════ */

const ADJUST_MAP = {
    health: {
        input: 'lostHealth',       tracker: 'currentHealthLost',
        cur:   'healthCurrent',    max:     'healthMax',
        bar:   'healthBar',        grp:     'healthDisplay'
    },
    mana: {
        input: 'lostMana',         tracker: 'currentManaLost',
        cur:   'manaCurrent',      max:     'manaMax',
        bar:   'manaBar',          grp:     'manaDisplay'
    },
    combatPoints: {
        input: 'usedCombatPoints', tracker: 'currentCPLost',
        cur:   'cpCurrent',        max:     'cpMax',
        bar:   'cpBar',            grp:     'cpDisplay'
    },
    sanity: {
        input: 'lostSanity',       tracker: 'currentSanityLost',
        cur:   'sanityCurrent',    max:     'sanityMax',
        bar:   'sanityBar',        grp:     'sanityDisplay'
    }
};

export function applyResourceAdjustment(resource) {
    const m = ADJUST_MAP[resource];
    if (!m) return;

    const inputEl = $(m.input);
    if (!inputEl) return;

    const delta = parseFloat(inputEl.value);
    if (isNaN(delta) || delta === 0) { inputEl.value = ''; return; }

    const trackerEl = $(m.tracker);
    if (!trackerEl) return;

    const newLost = Math.max(0, (parseFloat(trackerEl.value) || 0) + delta);
    trackerEl.value = newLost;
    inputEl.value   = '';

    updateResourceDisplay(m.cur, m.max, m.bar, m.grp, newLost);
}

/* ═══════════════════════════════════════
   FULL RESOURCE RECALCULATION
   Called by the main recalcAll() orchestrator
═══════════════════════════════════════ */

export function recalcCoreResources() {
    const maxH  = calcMaxHealth();
    const maxM  = calcMaxMana();
    const maxCP = calcMaxCombatPoints();
    const maxS  = calcMaxSanity();

    // Write max values to hidden fields
    sf('health',       maxH);
    sf('mana',         maxM);
    sf('combatPoints', maxCP);
    sf('sanity',       maxS);

    // Derived attributes
    const profVal  = calcProficiency();
    const refVal   = calcReflex();
    const physVal  = calcPhysCritDamage();
    const magVal   = calcMagicalDamage();
    const enchVal  = calcEnchantment();
    const ctrlVal  = calcControl();

    sf('proficiency',   profVal);
    sf('reflex',        refVal);
    sf('physCritDamage', physVal);
    sf('magicalDamage', magVal);
    sf('enchantment',   enchVal);
    sf('control',       ctrlVal);

    // Flash derived fields
    ['proficiency','reflex','physCritDamage',
     'magicalDamage','enchantment','control'].forEach(flashField);

    // Update resource displays
    const nv2 = id => { const e = $(id); return e ? (parseFloat(e.value) || 0) : 0; };

    updateResourceDisplay('healthCurrent','healthMax','healthBar','healthDisplay', nv2('currentHealthLost'));
    updateResourceDisplay('manaCurrent',  'manaMax',  'manaBar',  'manaDisplay',   nv2('currentManaLost'));
    updateResourceDisplay('cpCurrent',    'cpMax',    'cpBar',    'cpDisplay',     nv2('currentCPLost'));
    updateResourceDisplay('sanityCurrent','sanityMax','sanityBar','sanityDisplay', nv2('currentSanityLost'));
}

/* ─── Initialize resource adjust buttons ─── */
export function initCoreResources(onRecalc) {
    document.querySelectorAll('.adjust-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyResourceAdjustment(btn.dataset.target);
        });
    });

    // Also react when classSanity or raceSanity change
    ['classSanity', 'raceSanity'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('input', onRecalc);
    });
}