/* =============================================
   CHARACTER-DETAILS.JS
   Character identity fields: name, race,
   level, EXP, class trigger binding,
   personal character data.
   ============================================= */

'use strict';

import { $ } from './layout.js';

/* ─── Read helpers ─── */
function nv(id) { const e=$(id); return e ? (parseFloat(e.value)||0) : 0; }

/* ─── All personal field IDs (non-calculated) ─── */
export const DETAIL_FIELD_IDS = [
    'characterName', 'playerName',
    'className', 'classType', 'level', 'characterExp',
    'race', 'raceBonus', 'raceSanity', 'classSanity',
    'talents', 'traumas', 'languages',
    'armorName', 'sword1Name', 'sword2Name',
    'armorValue', 'sword1Damage', 'sword2Damage', 'baseDefense',
    'level1','level2','level3','level4',
    'level5','level10','level15','level20',
    'classTypeBonus', 'elementCount', 'inventory',
    'bonusTrait1', 'bonusTrait2', 'bonusTrait3'
];

/* ─── Calculated / resource IDs that are also saved ─── */
export const CALC_FIELD_IDS = [
    'health', 'mana', 'combatPoints', 'sanity',
    'proficiency', 'reflex', 'enchantment',
    'physCritDamage', 'magicalDamage', 'control',
    'physicalAttr', 'magicalAttr', 'socialAttr', 'classAttr',
    'agilityValue', 'strengthValue', 'enduranceValue',
    'agilityTotal', 'strengthTotal', 'enduranceTotal',
    'craftingValue', 'impactValue', 'manipulationValue',
    'craftingTotal', 'impactTotal', 'manipulationTotal',
    'deceptionValue', 'performanceValue', 'confidenceValue',
    'deceptionTotal', 'performanceTotal', 'confidenceTotal',
    'dodgeValue', 'combatValue', 'mysticValue',
    'dodgeTotal', 'combatTotal', 'mysticTotal',
    'ownedGrades', 'usedGrades', 'remainingGrades',
    'elementTraitData'
];

export const ALL_FIELD_IDS = [...DETAIL_FIELD_IDS, ...CALC_FIELD_IDS];

export const TRACKER_IDS = [
    'currentHealthLost', 'currentManaLost',
    'currentCPLost',     'currentSanityLost'
];

/* ─── Collect all form data ─── */
export function collectFormData(elementSelections) {
    const data = {};

    ALL_FIELD_IDS.forEach(id => {
        const el = $(id);
        if (el) data[id] = el.value;
    });

    TRACKER_IDS.forEach(id => {
        const el = $(id);
        if (el) data[id] = el.value;
    });

    // Element slot selections (from elements.js)
    if (elementSelections) {
        data._elementSelections = JSON.stringify(elementSelections);
    }

    return data;
}

/* ─── Populate form from saved data ─── */
export function populateForm(data) {
    ALL_FIELD_IDS.forEach(id => {
        const el = $(id);
        if (el && data[id] !== undefined) el.value = data[id];
    });

    TRACKER_IDS.forEach(id => {
        const el = $(id);
        if (el && data[id] !== undefined) el.value = data[id];
    });
}

/* ─── Get saved element selections from stored data ─── */
export function getStoredElementSelections(data) {
    if (!data || !data._elementSelections) return null;
    try { return JSON.parse(data._elementSelections); }
    catch (e) { return null; }
}

/* ─── Clear form to defaults ─── */
export function clearForm() {
    ALL_FIELD_IDS.forEach(id => {
        const el = $(id);
        if (!el) return;
        if (id === 'level')           { el.value = '1'; return; }
        if (id === 'elementTraitData'){ el.value = '{}'; return; }
        el.value = '';
    });

    TRACKER_IDS.forEach(id => {
        const el = $(id);
        if (el) el.value = '0';
    });

    const editEl = $('editCharacterId');
    if (editEl) editEl.value = '';
}

/* ─── Get current level ─── */
export function getCurrentLevel() {
    return Math.max(1, nv('level'));
}

/* ─── Initialize character details listeners ─── */
export function initCharacterDetails(onLevelChange) {
    const levelEl = $('level');
    if (levelEl) levelEl.addEventListener('input', onLevelChange);

    // EXP field is informational — ready for future automation
    const expEl = $('characterExp');
    if (expEl) expEl.addEventListener('input', () => {
        // Future: auto-level from EXP threshold
    });
}