/* =============================================
   SKILLS.JS
   All 12 skills, attribute bonuses, skill
   totals, skill point calculation (4.5/level),
   EXP tracking, overspend validation.
   ============================================= */

'use strict';

import { $, flashField, setOverspendWarning } from './layout.js';

/* ─── Numeric helper ─── */
function nv(id) {
    const el = $(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
}

function sf(id, v) { const el = $(id); if (el) el.value = v; }
function sh(id, t) { const el = $(id); if (el) el.textContent = t; }

/* ─── Skill point rate ─── */
export const SP_PER_LEVEL = 4.5;

/* ─── Skill → attribute → total map ─── */
export const SKILL_MAP = [
    { key:'agility',     val:'agilityValue',      attr:'physicalAttr', tot:'agilityTotal'      },
    { key:'strength',    val:'strengthValue',      attr:'physicalAttr', tot:'strengthTotal'     },
    { key:'endurance',   val:'enduranceValue',     attr:'physicalAttr', tot:'enduranceTotal'    },
    { key:'crafting',    val:'craftingValue',      attr:'magicalAttr',  tot:'craftingTotal'     },
    { key:'impact',      val:'impactValue',        attr:'magicalAttr',  tot:'impactTotal'       },
    { key:'manipulation',val:'manipulationValue',  attr:'magicalAttr',  tot:'manipulationTotal' },
    { key:'deception',   val:'deceptionValue',     attr:'socialAttr',   tot:'deceptionTotal'    },
    { key:'performance', val:'performanceValue',   attr:'socialAttr',   tot:'performanceTotal'  },
    { key:'confidence',  val:'confidenceValue',    attr:'socialAttr',   tot:'confidenceTotal'   },
    { key:'dodge',       val:'dodgeValue',         attr:'classAttr',    tot:'dodgeTotal'        },
    { key:'combat',      val:'combatValue',        attr:'classAttr',    tot:'combatTotal'       },
    { key:'mystic',      val:'mysticValue',        attr:'classAttr',    tot:'mysticTotal'       }
];

/* ─── Skill value input IDs for SP calculation ─── */
const SP_SKILL_IDS = SKILL_MAP.map(s => s.val);

/* ─── Get a skill total by key ─── */
export function getSkillTotal(key) {
    const entry = SKILL_MAP.find(s => s.key === key);
    if (!entry) return 0;
    return nv(entry.tot);
}

/* ─── Recalculate all skill totals (value + attribute) ─── */
export function recalcSkillTotals() {
    SKILL_MAP.forEach(s => {
        const newTotal = nv(s.val) + nv(s.attr);
        const oldTotal = nv(s.tot);
        sf(s.tot, newTotal);
        if (newTotal !== oldTotal) flashField(s.tot);
    });
}

/* ─── Skill points display ─── */
function fmt(n) { return (n % 1 === 0) ? String(n) : n.toFixed(1); }

export function recalcSkillPoints() {
    const level  = Math.max(1, nv('level'));
    const total  = level * SP_PER_LEVEL;
    const spent  = SP_SKILL_IDS.reduce((acc, id) => acc + nv(id), 0);
    const remain = total - spent;

    sh('spTotal',  fmt(total));
    sh('spSpent',  fmt(spent));
    sh('spRemain', fmt(remain));

    const remEl    = $('spRemain');
    const blockEl  = remEl ? remEl.closest('.sp-block') : null;
    const isOver   = remain < 0;

    if (remEl)   remEl.classList.toggle('sp-overspent',   isOver);
    if (blockEl) blockEl.classList.toggle('sp-block-warn', isOver);
}

/* ─── Full skill recalc (totals + points) ─── */
export function recalcSkills() {
    recalcSkillTotals();
    recalcSkillPoints();
}

/* ─── Initialize skill input listeners ─── */
export function initSkills(onRecalc) {
    // Attribute inputs
    ['physicalAttr','magicalAttr','socialAttr','classAttr'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('input', onRecalc);
    });

    // Individual skill value inputs
    document.querySelectorAll('.skill-value').forEach(el => {
        el.addEventListener('input', onRecalc);
    });

    // Level input (affects SP total)
    const levelEl = $('level');
    if (levelEl) levelEl.addEventListener('input', onRecalc);

    // EXP input (informational, no formula yet — ready for future use)
    const expEl = $('characterExp');
    if (expEl) expEl.addEventListener('input', () => {
        // placeholder for future EXP-to-level automation
    });
}