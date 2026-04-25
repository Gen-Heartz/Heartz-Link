/* =============================================
   ELEMENTS.JS
   Full elemental system: DB, slot rendering,
   trait selection, tier upgrades, grade costs,
   class-filtered element availability.
   ============================================= */

'use strict';

import { $, toggleElementSlot, setOverspendWarning } from './layout.js';
import { CLASS_DATA }                                 from './class-progression.js';

/* ─── Write helpers ─── */
function nv(id) { const e=$(id); return e ? (parseFloat(e.value)||0) : 0; }
function sf(id,v) { const e=$(id); if(e) e.value = v; }
function sh(id,t) { const e=$(id); if(e) e.textContent = t; }

/* ═══════════════════════════════════════
   ELEMENT CATEGORY MAP
═══════════════════════════════════════ */
export const ELEM_CATEGORIES = {
    'Natural':   ['Fire','Water','Earth','Air'],
    'Divergent': ['Lightning','Ice','Gravity','Sound'],
    'Mystic':    ['Metal','Vine'],
    'Holy':      ['Holy'],
    'Dark':      ['Dark'],
    'Blood':     ['Blood'],
    'Poison':    ['Poison']
};

/* ═══════════════════════════════════════
   ELEMENT TRAITS DATABASE
   All 15 elements, 9 traits each.
═══════════════════════════════════════ */
export const ELEM_DB = {
    'Fire': [
        { name:'Heat',          type:'Sequential Effect & Status', grade:1, costs:[1,2,4,6]    },
        { name:'Cauterization', type:'Instant Effect',             grade:2, costs:[3,4,6,9]    },
        { name:'Ashes',         type:'DoT Damage',                 grade:6, costs:[7,10,15,20] },
        { name:'Devour',        type:'Consecutive Damage',         grade:2, costs:[3,4,6,9]    },
        { name:'Explosion',     type:'Area Damage',                grade:1, costs:[1,2,4,6]    },
        { name:'Fusion',        type:'Lasting Effect',             grade:2, costs:[3,4,6,9]    },
        { name:'Illumination',  type:'Passive Effect & Status',    grade:1, costs:[1,2,4,6]    },
        { name:'Purification',  type:'Status Effect',              grade:3, costs:[5,7,10,15]  },
        { name:'Burning',       type:'DoT & Status Effect',        grade:1, costs:[1,2,4,6]    }
    ],
    'Water': [
        { name:'Dampening',      type:'Control Effect',           grade:2, costs:[3,4,6,9]    },
        { name:'Hydrotherapy',   type:'Status Effect',            grade:3, costs:[5,7,10,15]  },
        { name:'Electrification',type:'Control Effect',           grade:1, costs:[1,2,4,6]    },
        { name:'Fluidity',       type:'Control Effect',           grade:1, costs:[1,2,4,6]    },
        { name:'Humidification', type:'Passive + Control Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Neutralization', type:'Control Effect',           grade:2, costs:[3,4,6,9]    },
        { name:'Purification',   type:'Status Effect',            grade:1, costs:[1,2,4,6]    },
        { name:'Reflection',     type:'Instant Effect',           grade:3, costs:[5,7,10,15]  },
        { name:'Transmutation',  type:'Status Effect',            grade:2, costs:[3,4,6,9]    }
    ],
    'Earth': [
        { name:'Granulation',   type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Erosion',       type:'Status Effect',  grade:4, costs:[7,10,15,20] },
        { name:'Foundation',    type:'Control Effect', grade:1, costs:[1,2,4,6]    },
        { name:'Immobilization',type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Mimicry',       type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Shaping',       type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Petrification', type:'Status Effect',  grade:5, costs:[10,15,20,28]},
        { name:'Regeneration',  type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Resonance',     type:'Active Effect',  grade:2, costs:[3,4,6,9]    }
    ],
    'Air': [
        { name:'Amplification',    type:'Active Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Perception',       type:'Active Effect',  grade:3, costs:[5,7,10,15]  },
        { name:'Directional Control',type:'Control Effect',grade:2,costs:[3,4,6,9]    },
        { name:'Extensive Control', type:'Control Effect', grade:6, costs:[7,10,15,20] },
        { name:'Precise Control',   type:'Control Effect', grade:1, costs:[1,2,4,6]    },
        { name:'Ephemerality',      type:'Status Effect',  grade:5, costs:[10,15,20,28]},
        { name:'Levitation',        type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Purification',      type:'Status Effect',  grade:1, costs:[1,2,4,6]    },
        { name:'Gas Control',       type:'Control Effect', grade:3, costs:[5,7,10,15]  }
    ],
    'Lightning': [
        { name:'Charge',          type:'Passive Effect',    grade:3, costs:[5,7,10,15]  },
        { name:'Shock',           type:'Instant Damage',    grade:1, costs:[1,2,4,6]    },
        { name:'Discharge',       type:'Area Damage',       grade:3, costs:[5,7,10,15]  },
        { name:'Harmful Impulse', type:'Status Effect',     grade:2, costs:[3,4,6,9]    },
        { name:'Movement',        type:'Active Effect',     grade:4, costs:[7,10,15,20] },
        { name:'Paralysis',       type:'Status Effect',     grade:3, costs:[5,7,10,15]  },
        { name:'Swift Burst',     type:'Sequential Damage', grade:4, costs:[7,10,15,20] },
        { name:'Reflexes',        type:'Control Effect',    grade:2, costs:[3,4,6,9]    },
        { name:'Lightning Strike',type:'Area Damage',       grade:5, costs:[10,15,20,28]}
    ],
    'Ice': [
        { name:'Alteration',       type:'Active Effect',  grade:1, costs:[1,2,4,6]    },
        { name:'Frozen Path',      type:'Area Effect',    grade:3, costs:[5,7,10,15]  },
        { name:'Freezing',         type:'Instant Damage', grade:2, costs:[3,4,6,9]    },
        { name:'Cold Healing',     type:'Instant Effect', grade:1, costs:[1,2,4,6]    },
        { name:'Frozen Shatter',   type:'Control Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Glacial Expansion',type:'Control Effect', grade:4, costs:[7,10,15,20] },
        { name:'Slowness',         type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Snowstorm',        type:'Control Effect', grade:1, costs:[1,2,4,6]    },
        { name:'Temperature',      type:'Passive Effect', grade:2, costs:[3,4,6,9]    }
    ],
    'Gravity': [
        { name:'Barrier',       type:'Active Effect',  grade:3, costs:[5,7,10,15]  },
        { name:'Layers',        type:'Control Effect', grade:4, costs:[7,10,15,22] },
        { name:'Fixed',         type:'Active Effect',  grade:1, costs:[1,2,4,6]    },
        { name:'Focus',         type:'Control Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Free Lightness',type:'Control Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Repulsion',     type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Reverse',       type:'Control Effect', grade:5, costs:[10,15,20,28]},
        { name:'Overloaded',    type:'Active Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Zero',          type:'Active Effect',  grade:2, costs:[3,4,6,9]    }
    ],
    'Sound': [
        { name:'Sharp',          type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Medium',         type:'Active Effect',  grade:1, costs:[1,2,4,6]    },
        { name:'Deep',           type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Soft',           type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Moderate',       type:'Control Effect', grade:1, costs:[1,2,4,6]    },
        { name:'Intense',        type:'Control Damage', grade:4, costs:[7,10,15,20] },
        { name:'Musical',        type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Environmental',  type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Specific Effect',type:'Control Effect', grade:1, costs:[1,2,4,6]    }
    ],
    'Holy': [
        { name:'Nullification',type:'Active Effect',  grade:5, costs:[10,15,20,28]},
        { name:'Brightness',   type:'Passive Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Holy Flame',   type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Flash',        type:'Passive Effect', grade:1, costs:[1,2,4,6]    },
        { name:'Creation',     type:'Control Effect', grade:4, costs:[7,10,15,20] },
        { name:'Inviolability',type:'Status Effect',  grade:5, costs:[10,15,20,28]},
        { name:'Negation',     type:'Status Effect',  grade:1, costs:[1,2,4,9]    },
        { name:'Protection',   type:'Status Effect',  grade:3, costs:[5,7,10,15]  },
        { name:'Healing Touch',type:'Status Effect',  grade:2, costs:[3,4,6,9]    }
    ],
    'Dark': [
        { name:'Corruption',  type:'DoT Damage',            grade:4, costs:[7,10,15,20] },
        { name:'Debilitation',type:'Status Effect',          grade:2, costs:[3,4,6,9]    },
        { name:'Fading',      type:'Status Effect',          grade:1, costs:[1,2,4,6]    },
        { name:'Drain',       type:'Status Damage',          grade:5, costs:[10,15,20,28]},
        { name:'Illusions',   type:'Status Effect',          grade:3, costs:[5,7,10,15]  },
        { name:'Matter',      type:'Control Effect',         grade:1, costs:[1,2,4,6]    },
        { name:'Mold',        type:'Control Effect',         grade:2, costs:[3,4,6,9]    },
        { name:'Loss',        type:'Status Effect',          grade:1, costs:[1,2,4,6]    },
        { name:'Depths',      type:'Active + Status Effect', grade:3, costs:[5,7,10,15]  }
    ],
    'Blood': [
        { name:'Absorption',  type:'Active Effect',  grade:3, costs:[5,7,10,15]  },
        { name:'Acceleration',type:'Active Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Healing',     type:'Status Effect',  grade:1, costs:[1,2,4,6]    },
        { name:'Detection',   type:'Passive Effect', grade:1, costs:[1,2,4,6]    },
        { name:'Manipulation',type:'Control Effect', grade:4, costs:[7,10,15,20] },
        { name:'Morphing',    type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Purification',type:'Status Effect',  grade:3, costs:[5,7,10,15]  },
        { name:'Transfusion', type:'Control Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Binding',     type:'Control Effect', grade:4, costs:[7,10,15,20] }
    ],
    'Vine': [
        { name:'Communication',type:'Active Effect',        grade:3, costs:[5,7,10,15]  },
        { name:'Call',         type:'Control Damage',        grade:2, costs:[3,4,6,9]    },
        { name:'Healing',      type:'Status Effect',         grade:1, costs:[1,2,4,6]    },
        { name:'Dominion',     type:'Control Effect',        grade:3, costs:[5,7,10,15]  },
        { name:'Entanglement', type:'Control Effect',        grade:2, costs:[3,4,6,9]    },
        { name:'Floral',       type:'Control + DoT Effect',  grade:3, costs:[5,7,10,15]  },
        { name:'Blooming',     type:'Control Effect',        grade:3, costs:[5,7,10,15]  },
        { name:'Herbology',    type:'Control Effect',        grade:4, costs:[7,10,15,20] },
        { name:'Regeneration', type:'Active Effect',         grade:2, costs:[3,4,6,9]    }
    ],
    'Metal': [
        { name:'Sharpening',   type:'Active Effect',  grade:3, costs:[5,7,10,15]  },
        { name:'Enchanting',   type:'Active Effect',  grade:4, costs:[7,10,15,22] },
        { name:'Rust',         type:'Control Effect', grade:5, costs:[1,2,4,6]    },
        { name:'Fusion',       type:'Control Effect', grade:3, costs:[3,4,6,9]    },
        { name:'Magnetic',     type:'Control Effect', grade:3, costs:[3,4,6,9]    },
        { name:'Shaping',      type:'Control Effect', grade:1, costs:[5,7,10,15]  },
        { name:'Tempering',    type:'Passive Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Transmutation',type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Swift',        type:'Active Effect',  grade:1, costs:[1,2,4,6]    }
    ],
    'Poison': [
        { name:'Touch',        type:'Status Effect',  grade:1, costs:[1,2,4,6]    },
        { name:'Projectile',   type:'Active Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Mist',         type:'Control Effect', grade:2, costs:[3,4,6,9]    },
        { name:'Control',      type:'Status Effect',  grade:1, costs:[1,2,4,6]    },
        { name:'Transmutation',type:'Control Effect', grade:5, costs:[10,15,20,28]},
        { name:'Healing',      type:'Control Damage', grade:2, costs:[3,4,6,9]    },
        { name:'Paralysis',    type:'Control Effect', grade:3, costs:[5,7,10,15]  },
        { name:'Confusion',    type:'Status Effect',  grade:2, costs:[3,4,6,9]    },
        { name:'Weakness',     type:'Control Effect', grade:3, costs:[5,7,10,15]  }
    ]
};

/* ─── Quality tier names ─── */
export const QUALITY_NAMES = ['Common','Enhanced','Master','Unique'];

/* ─── Roman numerals ─── */
function toRoman(n) {
    const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let r = '';
    map.forEach(([v,s]) => { while (n >= v) { r += s; n -= v; } });
    return r;
}

/* ─── Max element slots ─── */
const MAX_SLOTS = 6;

/* ─── Internal trait upgrade state ─── */
let _traitState = {};

/* ─── Get/save trait state via hidden field ─── */
export function getTraitState() {
    try {
        const el = $('elementTraitData');
        return el && el.value ? JSON.parse(el.value) : {};
    } catch (e) { return {}; }
}

export function saveTraitState() {
    const el = $('elementTraitData');
    if (el) el.value = JSON.stringify(_traitState);
}

function traitKey(slot, elem, traitName) {
    return slot + ':' + elem + ':' + traitName;
}

/* ─── Derive available elements from class allowed categories ─── */
export function getAvailableElements() {
    const el  = $('className');
    const key = el && el.value ? el.value : '';
    const cd  = CLASS_DATA[key];
    if (!cd || !cd.allowedCats || cd.allowedCats.length === 0) return [];

    const set = new Set();
    cd.allowedCats.forEach(cat => {
        const list = ELEM_CATEGORIES[cat];
        if (list) list.forEach(e => set.add(e));
    });
    return Array.from(set).sort();
}

/* ═══════════════════════════════════════
   GRADE COST RECALCULATION
═══════════════════════════════════════ */
export function recalcGrades() {
    let totalUsed = 0;

    Object.keys(_traitState).forEach(k => {
        const tier = _traitState[k];
        if (tier < 0) return;

        const parts   = k.split(':');
        const elem    = parts[1];
        const tName   = parts.slice(2).join(':');
        const traits  = ELEM_DB[elem];
        if (!traits) return;

        const t = traits.find(tr => tr.name === tName);
        if (t) totalUsed += t.costs[tier];
    });

    const owned  = nv('ownedGrades');
    const remain = owned - totalUsed;

    sf('usedGrades',      totalUsed);
    sf('remainingGrades', remain);
    sh('usedGradesDisplay',   String(totalUsed));
    sh('remainGradesDisplay', String(remain));

    // Overspend visual
    const remEl  = $('remainGradesDisplay');
    const blockEl = remEl ? remEl.closest('.sp-block') : null;
    const isOver  = remain < 0;
    if (remEl)   remEl.classList.toggle('sp-overspent',   isOver);
    if (blockEl) blockEl.classList.toggle('sp-block-warn', isOver);

    // Update per-slot cost badges
    for (let i = 0; i < MAX_SLOTS; i++) _updateSlotCostBadge(i);
}

function _updateSlotCostBadge(slotIdx) {
    let total = 0;
    Object.keys(_traitState).forEach(k => {
        if (!k.startsWith(slotIdx + ':')) return;
        const tier  = _traitState[k];
        if (tier < 0) return;
        const parts  = k.split(':');
        const elem   = parts[1];
        const tName  = parts.slice(2).join(':');
        const traits = ELEM_DB[elem];
        if (!traits) return;
        const t = traits.find(tr => tr.name === tName);
        if (t) total += t.costs[tier];
    });

    const badge = $('elemSlotCost_' + slotIdx);
    if (badge) badge.textContent = total > 0 ? total + 'g' : '';
}

/* ═══════════════════════════════════════
   TRAIT PANEL RENDERER
═══════════════════════════════════════ */
function _renderTraitsForSlot(slotEl, slotIdx, elemName) {
    const panel = $('elemPanel_' + slotIdx);
    if (!panel) return;
    panel.innerHTML = '';

    if (!elemName || !ELEM_DB[elemName]) {
        slotEl.classList.remove('active', 'open');
        _updateSlotCostBadge(slotIdx);
        return;
    }

    slotEl.classList.add('active');

    const inner  = document.createElement('div');
    inner.className = 'elem-traits-inner';

    const traits = [...ELEM_DB[elemName]].sort((a,b) => a.grade - b.grade || a.name.localeCompare(b.name));

    traits.forEach(trait => {
        const key         = traitKey(slotIdx, elemName, trait.name);
        const currentTier = _traitState[key] !== undefined ? _traitState[key] : -1;

        const row  = document.createElement('div');
        row.className = 'elem-trait';

        // Info column
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

        // Tier column
        const tiers = document.createElement('div');
        tiers.className = 'elem-trait-tiers';

        QUALITY_NAMES.forEach((qName, qi) => {
            const tierRow = document.createElement('div');
            tierRow.className = 'elem-tier-row tier-' + qName.toLowerCase();

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'elem-tier-btn' + (qi === currentTier ? ' tier-active' : '');
            btn.textContent = qName;
            btn.title = qName + ' — Cost: ' + trait.costs[qi];

            btn.addEventListener('click', () => {
                _traitState[key] = (qi === currentTier) ? -1 : qi;
                if (_traitState[key] === -1) delete _traitState[key];
                saveTraitState();
                _renderTraitsForSlot(slotEl, slotIdx, elemName);
                recalcGrades();
            });

            const cost = document.createElement('span');
            cost.className = 'elem-tier-cost' + (qi === currentTier ? ' cost-active' : '');
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
    _updateSlotCostBadge(slotIdx);
}

/* ═══════════════════════════════════════
   SLOT CONTAINER RENDERER
   Called on class change or initial load.
═══════════════════════════════════════ */
export function renderElementSlots() {
    const container = $('elementSlotsContainer');
    if (!container) return;
    container.innerHTML = '';

    const classEl  = $('className');
    const className = classEl ? classEl.value : '';
    const cd        = CLASS_DATA[className];
    const count     = cd ? Math.min(cd.elCount, MAX_SLOTS) : 0;
    const available = getAvailableElements();

    if (count === 0) {
        container.innerHTML = '<p style="font-family:Cormorant Garamond,serif;font-size:.88rem;color:#4a2f18;opacity:.45;font-style:italic;text-align:center;padding:.8rem 0;">No elements available for this class.</p>';
        return;
    }

    for (let i = 0; i < count; i++) {
        const slot = document.createElement('div');
        slot.className = 'elem-slot';
        slot.dataset.slot = i;

        // ── Header ──
        const header = document.createElement('div');
        header.className = 'elem-slot-header';

        const num = document.createElement('span');
        num.className = 'elem-slot-number';
        num.textContent = String(i + 1);

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
            _renderTraitsForSlot(slot, i, this.value);
            recalcGrades();
        });

        selWrap.appendChild(sel);

        const costBadge = document.createElement('span');
        costBadge.className = 'elem-slot-cost';
        costBadge.id = 'elemSlotCost_' + i;

        const chev = document.createElement('span');
        chev.className = 'elem-slot-chevron';
        chev.innerHTML = '▼';

        // Clicking header (not the select itself) toggles accordion
        header.addEventListener('click', function(e) {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
            toggleElementSlot(slot);
        });

        header.appendChild(num);
        header.appendChild(selWrap);
        header.appendChild(costBadge);
        header.appendChild(chev);

        // ── Traits panel ──
        const panel = document.createElement('div');
        panel.className = 'elem-traits-panel';
        panel.id = 'elemPanel_' + i;

        slot.appendChild(header);
        slot.appendChild(panel);
        container.appendChild(slot);
    }
}

/* ═══════════════════════════════════════
   RESTORE ELEMENT SELECTIONS
   Called after populating a saved character.
═══════════════════════════════════════ */
export function restoreElementSlots(savedSelections) {
    _traitState = getTraitState();

    const container = $('elementSlotsContainer');
    if (!container) return;

    const slots = container.querySelectorAll('.elem-slot');
    slots.forEach(slot => {
        const idx = parseInt(slot.dataset.slot);
        const sel = slot.querySelector('select');
        if (!sel) return;

        const elemName = savedSelections ? (savedSelections[idx] || '') : '';
        if (elemName && sel.querySelector('option[value="' + elemName + '"]')) {
            sel.value = elemName;
            _renderTraitsForSlot(slot, idx, elemName);
        }
    });

    recalcGrades();
}

/* ─── Initialize owned-grades input listener ─── */
export function initElements() {
    const og = $('ownedGrades');
    if (og) og.addEventListener('input', recalcGrades);
}

/* ─── Collect current element slot selections for save ─── */
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
    _traitState = state || {};
    saveTraitState();
}