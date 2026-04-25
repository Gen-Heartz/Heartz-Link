/* =============================================
   HEARTZ LINK – Monster Book
   Updated: edit button + wired edit navigation
   ============================================= */

(function () {
    'use strict';

    var ENTRIES_PER_PAGE = 6;   // per page (half a spread)
    var currentSpread    = 0;
    var sortedMonsters   = [];
    var totalSpreads     = 0;

    document.addEventListener('DOMContentLoaded', function () {
        loadMonsters();
        initBackButton();
        initGoCreate();
        initPageControls();
        initModalControls();
        initKeyboard();
    });

    /* ── Data ─────────────────────────────────── */

    function loadMonsters() {
        var raw      = localStorage.getItem('heartzlink_monsters');
        var monsters = raw ? JSON.parse(raw) : [];

        sortedMonsters = monsters.slice().sort(function (a, b) {
            return (a.name || '').localeCompare(b.name || '');
        });

        var emptyEl    = document.getElementById('emptyState');
        var bookEl     = document.getElementById('book');
        var indicEl    = document.getElementById('pageIndicator');

        if (sortedMonsters.length === 0) {
            emptyEl.style.display  = 'block';
            bookEl.style.display   = 'none';
            indicEl.style.display  = 'none';
        } else {
            emptyEl.style.display  = 'none';
            bookEl.style.display   = 'flex';
            indicEl.style.display  = 'block';
            totalSpreads = Math.ceil(sortedMonsters.length / (ENTRIES_PER_PAGE * 2));
            if (currentSpread >= totalSpreads) currentSpread = Math.max(0, totalSpreads - 1);
            renderSpread();
        }
    }

    /* ── Book rendering ───────────────────────── */

    function renderSpread() {
        var leftStart  = currentSpread * ENTRIES_PER_PAGE * 2;
        var rightStart = leftStart + ENTRIES_PER_PAGE;

        renderPage('pageContentLeft',  sortedMonsters.slice(leftStart,  leftStart  + ENTRIES_PER_PAGE));
        renderPage('pageContentRight', sortedMonsters.slice(rightStart, rightStart + ENTRIES_PER_PAGE));

        var leftNum  = currentSpread * 2 + 1;
        var rightNum = leftNum + 1;
        document.getElementById('pageNumLeft').textContent  = leftNum;
        document.getElementById('pageNumRight').textContent = rightNum;
        document.getElementById('currentSpread').textContent = leftNum + '–' + rightNum;
        document.getElementById('totalPages').textContent    = totalSpreads * 2;

        document.getElementById('prevPage').disabled = (currentSpread === 0);
        document.getElementById('nextPage').disabled = (currentSpread >= totalSpreads - 1);
    }

    function renderPage(containerId, monsters) {
        var container = document.getElementById(containerId);
        container.innerHTML = '';

        if (monsters.length === 0) {
            var p = document.createElement('p');
            p.style.cssText = 'text-align:center;opacity:.3;font-style:italic;padding:2rem 0;font-size:.9rem;color:#4a2f18;';
            p.textContent = '~ blank page ~';
            container.appendChild(p);
            return;
        }

        monsters.forEach(function (monster) {
            container.appendChild(buildEntry(monster));
        });
    }

    /*
     * Each book entry now has:
     *   - thumbnail
     *   - name + region
     *   - an Edit button  ← NEW
     *   - chevron (opens detail modal)
     */
    function buildEntry(monster) {
        var entry = document.createElement('div');
        entry.className = 'monster-entry';

        /* ── thumb ── */
        var thumb = document.createElement('div');
        thumb.className = 'entry-thumb';
        if (monster.image) {
            var img = document.createElement('img');
            img.src = monster.image;
            img.alt = monster.name || '';
            thumb.appendChild(img);
        } else {
            thumb.textContent = (monster.name || '?').charAt(0).toUpperCase();
            thumb.style.cssText += ';font-family:\'Cinzel\',serif;font-weight:700;font-size:1.1rem;opacity:.4;';
        }

        /* ── info ── */
        var info = document.createElement('div');
        info.className = 'entry-info';

        var nameEl = document.createElement('div');
        nameEl.className   = 'entry-name';
        nameEl.textContent = monster.name || 'Unnamed';

        var regionEl = document.createElement('div');
        regionEl.className   = 'entry-region';
        regionEl.textContent = (monster.regions && monster.regions.length)
            ? monster.regions.join(', ')
            : (monster.region || 'Unknown Region');

        info.appendChild(nameEl);
        info.appendChild(regionEl);

        /* ── edit button ── */
        var editBtn = document.createElement('button');
        editBtn.className = 'entry-edit-btn';
        editBtn.innerHTML = '&#9998;';
        editBtn.setAttribute('aria-label', 'Edit ' + (monster.name || 'monster'));
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', function (e) {
            e.stopPropagation();    // don't open modal
            openEditPage(monster.id);
        });

        /* ── chevron (opens detail) ── */
        var arrow = document.createElement('span');
        arrow.className = 'entry-arrow';
        arrow.innerHTML = '&#8250;';

        /* ── whole row opens detail modal ── */
        entry.addEventListener('click', function () {
            openModal(monster);
        });

        entry.appendChild(thumb);
        entry.appendChild(info);
        entry.appendChild(editBtn);
        entry.appendChild(arrow);

        return entry;
    }

    /* ── Navigate to edit page ────────────────── */

    function openEditPage(monsterId) {
        navigateTo('CreateMonster.html?edit=' + encodeURIComponent(monsterId));
    }

    /* ── Page controls ────────────────────────── */

    function initPageControls() {
        document.getElementById('prevPage').addEventListener('click', function () {
            if (currentSpread > 0) { currentSpread--; renderSpread(); }
        });
        document.getElementById('nextPage').addEventListener('click', function () {
            if (currentSpread < totalSpreads - 1) { currentSpread++; renderSpread(); }
        });
    }

    /* ── Detail modal ─────────────────────────── */

    function openModal(monster) {
        var modal = document.getElementById('monsterModal');
        modal.classList.add('active');

        document.getElementById('modalName').textContent  = monster.name  || 'Unnamed';
        var aliasEl = document.getElementById('modalAlias');
        aliasEl.textContent = monster.alias ? '"' + monster.alias + '"' : '';

        /* image */
        var imgWrapper = document.getElementById('modalImageWrapper');
        imgWrapper.innerHTML = '';
        if (monster.image) {
            var img = document.createElement('img');
            img.src = monster.image;
            img.alt = monster.name || '';
            imgWrapper.appendChild(img);
        } else {
            var ph = document.createElement('div');
            ph.className   = 'modal-image-placeholder';
            ph.textContent = 'No Image';
            imgWrapper.appendChild(ph);
        }

        /* region */
        var regionText = (monster.regions && monster.regions.length)
            ? monster.regions.join(', ')
            : (monster.region || '—');
        document.getElementById('modalRegion').textContent = regionText;

        /* diet + prey */
        var dietParts = [];
        if (monster.diet) dietParts.push(monster.diet);
        if (monster.prey && monster.prey.length) dietParts.push('Prey: ' + monster.prey.join(', '));
        document.getElementById('modalDiet').textContent = dietParts.join(' — ') || '—';

        document.getElementById('modalAppearance').textContent = monster.appearance || '—';

        renderModalStats(monster);
        renderModalElements(monster);
        renderModalLoot(monster);

        /* wire edit button inside modal */
        var modalEditBtn = document.getElementById('modalEditBtn');
        if (modalEditBtn) {
            modalEditBtn.onclick = function () {
                closeModal();
                openEditPage(monster.id);
            };
        }
    }

    function renderModalStats(monster) {
        var container = document.getElementById('modalStats');
        container.innerHTML = '';

        var skills = monster.skills || {};
        var phys   = skills.physical || {};
        var mag    = skills.magical  || {};
        var extra  = skills.extra    || {};

        var allStats = [
            { label:'Agility',      value: phys.agility      || 0 },
            { label:'Strength',     value: phys.strength     || 0 },
            { label:'Endurance',    value: phys.endurance    || 0 },
            { label:'Crafting',     value: mag.crafting      || 0 },
            { label:'Impact',       value: mag.impact        || 0 },
            { label:'Manipulation', value: mag.manipulation  || 0 }
        ];
        Object.keys(extra).forEach(function (k) {
            allStats.push({ label: k, value: extra[k] || 0 });
        });

        allStats.forEach(function (s) {
            var item = document.createElement('div');
            item.className = 'stat-item';
            item.innerHTML =
                '<div class="stat-value">' + s.value + '</div>' +
                '<div class="stat-label">'  + s.label + '</div>';
            container.appendChild(item);
        });
    }

    function renderModalElements(monster) {
        var container = document.getElementById('modalElements');
        container.innerHTML = '';

        /* elements is now a string array e.g. ["Fire","Dark"] */
        var elems = Array.isArray(monster.elements)
            ? monster.elements
            : Object.keys(monster.elements || {});

        if (elems.length === 0) {
            container.innerHTML = '<span style="opacity:.4;font-style:italic;font-size:.85rem;">None</span>';
            return;
        }
        elems.forEach(function (el) {
            var tag = document.createElement('span');
            tag.className   = 'element-tag';
            tag.textContent = el;
            container.appendChild(tag);
        });
    }

    function renderModalLoot(monster) {
        var container = document.getElementById('modalLoot');
        container.innerHTML = '';
        var items = monster.extractableItems || [];

        if (items.length === 0) {
            container.innerHTML = '<span style="opacity:.4;font-style:italic;font-size:.85rem;">No items</span>';
            return;
        }
        items.forEach(function (item) {
            var row = document.createElement('div');
            row.className = 'loot-item';
            row.innerHTML =
                '<span class="loot-name">' + (item.name || '?') + '</span>' +
                '<span class="loot-rarity">' + (item.rarity || '?') +
                    ' (Diff: ' + (item.difficulty || '?') + ')</span>';
            container.appendChild(row);
        });
    }

    function initModalControls() {
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('monsterModal').addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
    }

    function closeModal() {
        document.getElementById('monsterModal').classList.remove('active');
    }

    /* ── Navigation ───────────────────────────── */

    function initBackButton() {
        document.getElementById('backBtn').addEventListener('click', function () {
            navigateTo('Bestiary.html');
        });
    }

    function initGoCreate() {
        var btn = document.getElementById('goCreateBtn');
        if (btn) btn.addEventListener('click', function () { navigateTo('CreateMonster.html'); });
    }

    function navigateTo(url) {
        document.body.style.transition = 'opacity .35s ease-out';
        document.body.style.opacity    = '0';
        setTimeout(function () { window.location.href = url; }, 350);
    }

    function initKeyboard() {
        document.addEventListener('keydown', function (e) {
            var modal = document.getElementById('monsterModal');
            if (modal.classList.contains('active')) {
                if (e.key === 'Escape') closeModal();
                return;
            }
            if (e.key === 'ArrowLeft')  { var p = document.getElementById('prevPage'); if (!p.disabled) p.click(); }
            if (e.key === 'ArrowRight') { var n = document.getElementById('nextPage'); if (!n.disabled) n.click(); }
            if (e.key === 'Escape' || e.key === 'Backspace') navigateTo('Bestiary.html');
        });
    }

})();