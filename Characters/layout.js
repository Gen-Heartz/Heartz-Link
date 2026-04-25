/* =============================================
   LAYOUT.JS
   UI behavior, navigation, modals, accordions,
   overlays, responsive helpers.
   No RPG formulas here.
   ============================================= */

'use strict';

/* ─── DOM Helper ─── */
export const $ = id => document.getElementById(id);

/* ─── Toast ─── */
export function showToast(message) {
    const toast = $('toast');
    const text  = $('toastText');
    if (!toast || !text) return;
    text.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ─── Flash animation on a field ─── */
export function flashField(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('field-flash');
    void el.offsetWidth;           // force reflow
    el.classList.add('field-flash');
    setTimeout(() => el.classList.remove('field-flash'), 600);
}

/* ─── Element slot accordion toggle ─── */
export function toggleElementSlot(slotEl) {
    slotEl.classList.toggle('open');
}

/* ─── Class info bar visibility ─── */
export function showClassInfoBar(visible) {
    const bar = $('classInfoBar');
    if (!bar) return;
    if (visible) {
        bar.classList.add('visible');
    } else {
        bar.classList.remove('visible');
    }
}

/* ─── Characters list overlay ─── */
export function openListOverlay() {
    const ov = $('charactersListOverlay');
    if (ov) ov.classList.add('active');
}

export function closeListOverlay() {
    const ov = $('charactersListOverlay');
    if (ov) ov.classList.remove('active');
}

/* ─── Confirm dialog overlay ─── */
export function openConfirmOverlay() {
    const ov = $('confirmOverlay');
    if (ov) ov.classList.add('active');
}

export function closeConfirmOverlay() {
    const ov = $('confirmOverlay');
    if (ov) ov.classList.remove('active');
}

/* ─── Section sub-header label helpers ─── */
export function setInfoText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}

/* ─── Resource low-state visual ─── */
export function setResourceLowState(groupId, isLow) {
    const el = $(groupId);
    if (!el) return;
    if (isLow) {
        el.classList.add('resource-low');
    } else {
        el.classList.remove('resource-low');
    }
}

/* ─── Resource bar width ─── */
export function setBarWidth(barId, percent) {
    const bar = $(barId);
    if (bar) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
}

/* ─── SP / Grade overspend warning ─── */
export function setOverspendWarning(valueElId, blockElId, isOver) {
    const val   = $(valueElId);
    const block = $(blockElId);
    if (val)   val.classList.toggle('sp-overspent',   isOver);
    if (block) block.classList.toggle('sp-block-warn', isOver);
}

/* ─── Characters list card renderer helper ─── */
export function buildCharacterCard(char) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.style.cssText = 'opacity:0;transform:translateY(10px)';

    const nm = char.characterName || 'Unnamed';
    const pl = char.playerName   ? 'Player: ' + char.playerName : '';
    const cl = char.className    ? ' · ' + char.className       : '';
    const tp = char.classType    ? ' (' + char.classType + ')'  : '';
    const lv = char.level        ? ' · Lv.' + char.level        : '';
    const details = (pl + cl + tp + lv) || 'No details';

    card.innerHTML = `
        <div class="card-info">
            <div class="card-name">${escapeHtml(nm)}</div>
            <div class="card-details">${escapeHtml(details)}</div>
        </div>
        <div class="card-actions">
            <button class="card-action-btn view-btn"   data-id="${char.id}">View</button>
            <button class="card-action-btn edit-btn"   data-id="${char.id}">Edit</button>
            <button class="card-action-btn delete-btn" data-id="${char.id}">Delete</button>
        </div>`;

    return card;
}

/* ─── Animate card entry ─── */
export function animateCardIn(card, delay) {
    setTimeout(() => {
        card.style.transition = 'opacity .38s ease, transform .38s ease';
        card.style.opacity    = '1';
        card.style.transform  = 'translateY(0)';
    }, delay);
}

/* ─── Empty state toggle ─── */
export function showEmptyState(show) {
    const grid  = $('charactersGrid');
    const empty = $('emptyState');
    if (!grid || !empty) return;

    if (show) {
        empty.classList.add('visible');
        grid.style.display = 'none';
    } else {
        empty.classList.remove('visible');
        grid.style.display = 'grid';
    }
}

/* ─── Escape HTML ─── */
export function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

/* ─── View-mode lock (makes all inputs read-only) ─── */
export function applyViewModeLock(form) {
    if (!form) return;

    form.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => {
        if (!el.classList.contains('field-locked') &&
            !el.classList.contains('elem-grade-input')) {
            el.readOnly       = true;
            el.style.opacity  = '.75';
            el.style.cursor   = 'default';
        }
    });

    form.querySelectorAll('select').forEach(el => {
        el.disabled       = true;
        el.style.opacity  = '.75';
    });

    document.querySelectorAll('.adjust-btn, .field-adjust').forEach(el => {
        el.style.display = 'none';
    });

    document.querySelectorAll('.elem-tier-btn').forEach(b => {
        b.style.pointerEvents = 'none';
        b.style.opacity       = '.5';
    });

    const og = $('ownedGrades');
    if (og) { og.readOnly = true; og.style.opacity = '.75'; }
}

/* ─── Keyboard shortcut setup ─── */
export function initKeyboardShortcuts(onEscape) {
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') onEscape();
    });
}

/* ─── Main-page navigation buttons ─── */
export function initMainNavButtons(onCreateCharacter, onOpenList) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page === 'create-character') onCreateCharacter();
            else if (page === 'characters-list') onOpenList();
        });
    });
}

/* ─── Close-panel button ─── */
export function initClosePanelButton() {
    const btn = $('closePanelBtn');
    if (btn) btn.addEventListener('click', closeListOverlay);

    const ov = $('charactersListOverlay');
    if (ov) ov.addEventListener('click', e => {
        if (e.target === ov) closeListOverlay();
    });
}

/* ─── Confirm dialog buttons ─── */
export function initConfirmButtons(onConfirm, onCancel) {
    const yes = $('confirmYes');
    const no  = $('confirmNo');
    const ov  = $('confirmOverlay');

    if (yes) yes.addEventListener('click', onConfirm);
    if (no)  no.addEventListener('click',  onCancel);
    if (ov)  ov.addEventListener('click',  e => { if (e.target === ov) onCancel(); });
}

/* ─── Adjust field: Enter-key triggers click on its apply button ─── */
export function initAdjustFieldEnterKeys() {
    document.querySelectorAll('.field-adjust').forEach(field => {
        field.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const wrap = field.closest('.adjust-wrapper');
            if (wrap) {
                const btn = wrap.querySelector('.adjust-btn');
                if (btn) btn.click();
            }
        });
    });
}