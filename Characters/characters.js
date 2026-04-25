/* =============================================
   CHARACTERS.JS  —  Main Entry / Orchestrator
   Imports all modules, initializes all systems,
   manages save/load, character list, and the
   master recalcAll() chain.
   No heavy logic lives here.
   ============================================= */

'use strict';

/* ─── Module imports ─── */
import {
    $,
    showToast,
    escapeHtml,
    buildCharacterCard,
    animateCardIn,
    showEmptyState,
    applyViewModeLock,
    initKeyboardShortcuts,
    initMainNavButtons,
    initClosePanelButton,
    initConfirmButtons,
    initAdjustFieldEnterKeys,
    openListOverlay,
    closeListOverlay,
    openConfirmOverlay,
    closeConfirmOverlay
} from './layout.js';

import {
    recalcCoreResources,
    initCoreResources
} from './core-resources.js';

import {
    recalcSkills,
    initSkills
} from './skills.js';

import {
    applyClassData,
    getClassDef,
    initClassProgression
} from './class-progression.js';

import {
    renderElementSlots,
    restoreElementSlots,
    recalcGrades,
    initElements,
    collectElementSelections,
    loadTraitState,
    getTraitState,
    saveTraitState
} from './elements.js';

import {
    collectFormData,
    populateForm,
    clearForm,
    getStoredElementSelections,
    initCharacterDetails,
    ALL_FIELD_IDS,
    TRACKER_IDS
} from './character-details.js';

/* ═══════════════════════════════════════
   STORAGE
═══════════════════════════════════════ */
const STORAGE_KEY = 'heartzlink_characters';

function getCharacters() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
}

function saveCharacters(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch (e) { console.error('Save error', e); }
}

function generateId() {
    return 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

/* ═══════════════════════════════════════
   MASTER RECALCULATION CHAIN
   Order matters: skills → class → resources → grades
═══════════════════════════════════════ */
function recalcAll() {
    recalcSkills();          // totals + SP display
    recalcCoreResources();   // HP, Mana, CP, Sanity + derived attrs
    recalcGrades();          // element grade cost totals
}

/* ═══════════════════════════════════════
   CLASS CHANGE HANDLER
═══════════════════════════════════════ */
function onClassChange() {
    applyClassData();     // fill locked type fields + info bar
    renderElementSlots(); // rebuild element slots for new class
    recalcAll();
}

/* ═══════════════════════════════════════
   CHARACTERS LIST PAGE
═══════════════════════════════════════ */
let _deleteId = null;

function renderList() {
    const grid = $('charactersGrid');
    if (!grid) return;

    const list = getCharacters();
    grid.innerHTML = '';

    showEmptyState(list.length === 0);
    if (list.length === 0) return;

    list.forEach((char, index) => {
        const card = buildCharacterCard(char);
        grid.appendChild(card);
        animateCardIn(card, 50 + index * 75);
    });

    // Button listeners
    grid.querySelectorAll('.view-btn').forEach(btn =>
        btn.addEventListener('click', () => {
            window.location.href = 'create-character.html?view=' + btn.dataset.id;
        })
    );
    grid.querySelectorAll('.edit-btn').forEach(btn =>
        btn.addEventListener('click', () => {
            window.location.href = 'create-character.html?edit=' + btn.dataset.id;
        })
    );
    grid.querySelectorAll('.delete-btn').forEach(btn =>
        btn.addEventListener('click', () => {
            _deleteId = btn.dataset.id;
            openConfirmOverlay();
        })
    );
}

function handleConfirmDelete() {
    if (!_deleteId) return;
    saveCharacters(getCharacters().filter(c => c.id !== _deleteId));
    _deleteId = null;
    closeConfirmOverlay();
    renderList();
}

function handleCancelDelete() {
    _deleteId = null;
    closeConfirmOverlay();
}

/* ═══════════════════════════════════════
   JSON EXPORT / IMPORT
═══════════════════════════════════════ */
function exportJSON() {
    const blob = new Blob(
        [JSON.stringify({ heartzlink_characters: getCharacters() }, null, 2)],
        { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url;
    a.download = 'heartzlink_characters.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data.heartzlink_characters)) {
                    saveCharacters(data.heartzlink_characters);
                    resolve(data.heartzlink_characters);
                } else {
                    reject(new Error('Invalid format'));
                }
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsText(file);
    });
}

// Public API for Home.js integration
window.HeartzLinkCharacters = { getCharacters, saveCharacters, exportJSON, importJSON };

/* ═══════════════════════════════════════
   SAVE CHARACTER
═══════════════════════════════════════ */
function saveCharacter() {
    saveTraitState();

    const selections = collectElementSelections();
    const data       = collectFormData(selections);
    const list       = getCharacters();
    const editEl     = $('editCharacterId');
    const existingId = editEl ? editEl.value : '';

    if (existingId) {
        const idx = list.findIndex(c => c.id === existingId);
        if (idx !== -1) {
            data.id        = existingId;
            data.createdAt = list[idx].createdAt;
            data.updatedAt = new Date().toISOString();
            list[idx] = data;
            saveCharacters(list);
            showToast('Character updated!');
        }
    } else {
        data.id        = generateId();
        data.createdAt = new Date().toISOString();
        data.updatedAt = data.createdAt;
        list.push(data);
        saveCharacters(list);
        if (editEl) editEl.value = data.id;
        showToast('Character created!');
    }
}

/* ═══════════════════════════════════════
   LOAD CHARACTER INTO FORM
═══════════════════════════════════════ */
function loadCharacterIntoForm(char) {
    // 1. Set class field first so slot render knows which class
    const classEl = $('className');
    if (classEl && char.className) classEl.value = char.className;

    // 2. Render slots for this class
    renderElementSlots();

    // 3. Populate all standard fields
    populateForm(char);

    // 4. Restore element trait state
    try {
        const savedState = char.elementTraitData ? JSON.parse(char.elementTraitData) : {};
        loadTraitState(savedState);
    } catch (e) {
        loadTraitState({});
    }

    // 5. Restore element slot selections
    const selections = getStoredElementSelections(char);
    restoreElementSlots(selections);

    // 6. Trigger class info bar + full recalc
    setTimeout(() => {
        applyClassData();
        recalcAll();
    }, 60);
}

/* ═══════════════════════════════════════
   CLEAR FORM
═══════════════════════════════════════ */
function handleClearForm() {
    clearForm();
    loadTraitState({});
    renderElementSlots();
    applyClassData();
    recalcAll();
    showToast('Form cleared');
}

/* ═══════════════════════════════════════
   INIT — MAIN PAGE (characters.html)
═══════════════════════════════════════ */
function initMainPage() {
    initMainNavButtons(
        () => { window.location.href = 'create-character.html'; },
        () => { renderList(); openListOverlay(); }
    );

    initClosePanelButton();

    initConfirmButtons(handleConfirmDelete, handleCancelDelete);

    initKeyboardShortcuts(() => {
        const conf = $('confirmOverlay');
        if (conf && conf.classList.contains('active')) {
            handleCancelDelete();
            return;
        }
        const list = $('charactersListOverlay');
        if (list && list.classList.contains('active')) {
            closeListOverlay();
        }
    });
}

/* ═══════════════════════════════════════
   INIT — CREATE CHARACTER PAGE
═══════════════════════════════════════ */
function initCreatePage() {
    const form    = $('characterForm');
    const clrBtn  = $('clearFormBtn');
    const editFld = $('editCharacterId');

    // ── Module initializers ──
    initClassProgression(onClassChange);

    initSkills(recalcAll);

    initCoreResources(recalcAll);

    initElements();

    initCharacterDetails(recalcAll);

    initAdjustFieldEnterKeys();

    // ── URL params: edit / view ──
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    const viewId = params.get('view');

    if (editId || viewId) {
        const targetId = editId || viewId;
        const char     = getCharacters().find(c => c.id === targetId);

        if (char) {
            if (editFld) editFld.value = char.id;
            loadCharacterIntoForm(char);

            if (viewId) {
                // Apply view-mode lock after a tick (slots need to render first)
                setTimeout(() => {
                    applyViewModeLock(form);

                    const saveBtn = form ? form.querySelector('.save-btn') : null;
                    if (saveBtn) {
                        saveBtn.querySelector('.btn-label').textContent = 'Edit Character';
                        saveBtn.querySelector('.btn-icon').textContent  = '✏️';
                        saveBtn.type = 'button';
                        saveBtn.addEventListener('click', () => {
                            window.location.href = 'create-character.html?edit=' + viewId;
                        });
                    }

                    if (clrBtn) clrBtn.style.display = 'none';
                }, 120);
            }
        }
    } else {
        // Fresh form
        renderElementSlots();
        recalcAll();
    }

    // ── Form submit ──
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            saveCharacter();
        });
    }

    // ── Clear form button ──
    if (clrBtn) {
        clrBtn.addEventListener('click', handleClearForm);
    }

    // ── Keyboard shortcuts ──
    initKeyboardShortcuts(() => {
        const conf = $('confirmOverlay');
        if (conf && conf.classList.contains('active')) {
            handleCancelDelete();
        }
    });
}

/* ═══════════════════════════════════════
   BOOTSTRAP — auto-detect page
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    if ($('characterForm'))         initCreatePage();
    if ($('charactersListOverlay')) initMainPage();
});