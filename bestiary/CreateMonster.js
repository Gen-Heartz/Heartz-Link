/* =============================================
   HEARTZ LINK — Create / Edit Monster
   Fixed: image compression via imageUtils.js
          eliminates localStorage quota exhaustion
   ============================================= */

(function () {
    'use strict';

    /* ── Guard: imageUtils must be loaded ────── */
    if (!window.HeartzImageUtils) {
        console.error('[CreateMonster] imageUtils.js not loaded.');
    }
    var ImgUtil = window.HeartzImageUtils || {
        compressFile:        function (f, cb) { cb(null); },
        compressImage:       function (s, cb) { cb(null); },
        migrateStoredImages: function (k, cb) { if (cb) cb(); }
    };

    /* ── Constants ───────────────────────────── */
    var ELEMENTS = [
        'Fire','Water','Earth','Air','Lightning','Ice',
        'Gravity','Sound','Blood','Poison','Plant','Metal',
        'Holy','Dark','Time','Dimension','Crystal','Ether'
    ];
    var STORAGE_MONSTERS = 'heartzlink_monsters';
    var STORAGE_REGIONS  = 'heartzlink_regions';

    /* ── Edit-mode state ─────────────────────── */
    var editMonster = null;
    var editMode    = false;

    /* ── Form state ──────────────────────────── */
    var state = {
        image:           null,   /* compressed base-64 string or null */
        selectedRegions: [],
        selectedPrey:    [],
        activeElements:  {}
    };

    /* ── Boot ────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        /*
         * Migrate any oversized images already in storage BEFORE
         * we render anything so the page starts from a clean state.
         */
        ImgUtil.migrateStoredImages(STORAGE_MONSTERS, function () {
            resolveEditMode();
            initImageUpload();
            initRegionSelector();
            initPreySelector();
            initElementTags();
            initDynamicLists();
            initSave();
            initBack();
            initDeleteModal();

            if (editMode && editMonster) {
                applyEditData(editMonster);
            }
        });
    });

    /* ══════════════════════════════════════════
       EDIT-MODE DETECTION
    ══════════════════════════════════════════ */
    function resolveEditMode() {
        var params = new URLSearchParams(window.location.search);
        var id     = params.get('edit');
        if (!id) return;

        var found = getStorageArray(STORAGE_MONSTERS)
            .find(function (m) { return m.id === id; });
        if (!found) return;

        editMonster = found;
        editMode    = true;

        var titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = 'Edit Monster';
        document.title = 'Heartz Link – Edit Monster';

        var delBtn = document.getElementById('deleteMonsterBtn');
        if (delBtn) delBtn.style.display = 'flex';
    }

    /* ══════════════════════════════════════════
       PREFILL  (edit mode)
    ══════════════════════════════════════════ */
    function applyEditData(m) {
        setVal('monsterName',       m.name        || '');
        setVal('monsterAlias',      m.alias       || '');
        setVal('monsterDiet',       m.diet        || '');
        setVal('monsterAppearance', m.appearance  || '');

        var phys = (m.skills && m.skills.physical) || {};
        var mag  = (m.skills && m.skills.magical)  || {};
        setNum('statAgility',      phys.agility     || 0);
        setNum('statStrength',     phys.strength    || 0);
        setNum('statEndurance',    phys.endurance   || 0);
        setNum('statCrafting',     mag.crafting     || 0);
        setNum('statImpact',       mag.impact       || 0);
        setNum('statManipulation', mag.manipulation || 0);

        var extra = (m.skills && m.skills.extra) || {};
        Object.keys(extra).forEach(function (name) { addSkillRow(name, extra[name]); });

        (m.extractableItems || []).forEach(function (item) {
            addItemRow(item.name, item.rarity, item.difficulty);
        });

        /* regions */
        state.selectedRegions = (m.regions || (m.region ? [m.region] : [])).slice();
        rebuildWidget('regionChips','regionSearch','regionDropdown',
            getRegionNames,
            function ()  { return state.selectedRegions; },
            function (v) { state.selectedRegions = v; }
        );

        /* prey */
        state.selectedPrey = (m.prey || []).slice();
        rebuildWidget('preyChips','preySearch','preyDropdown',
            function () { return getExistingMonsterNames(m.id); },
            function ()  { return state.selectedPrey; },
            function (v) { state.selectedPrey = v; }
        );

        /* elements */
        var elems = Array.isArray(m.elements)
            ? m.elements : Object.keys(m.elements || {});
        elems.forEach(function (el) {
            state.activeElements[el] = true;
            var btn = document.querySelector('[data-element="' + el + '"]');
            if (btn) btn.classList.add('active');
        });

        /* image — already compressed when originally saved */
        if (m.image) {
            state.image = m.image;
            renderImagePreview();
        }
    }

    /* ══════════════════════════════════════════
       IMAGE UPLOAD  — uses compressFile()
       ──────────────────────────────────────────
       Flow:
         File selected / dropped
           → FileReader in compressFile()
           → canvas resize + JPEG encode
           → state.image = compressed data-URL
           → renderImagePreview()

       This keeps every stored image ≤ 250 KB,
       preventing localStorage quota exhaustion.
    ══════════════════════════════════════════ */
    function initImageUpload() {
        var drop     = document.getElementById('imageDrop');
        var input    = document.getElementById('imageFileInput');
        var clearBtn = document.getElementById('clearImgBtn');

        drop.addEventListener('click', function (e) {
            if (clearBtn && clearBtn.contains(e.target)) return;
            if (state.image) return;
            input.click();
        });

        drop.addEventListener('dragover', function (e) {
            e.preventDefault();
            drop.classList.add('drag-over');
        });
        drop.addEventListener('dragleave', function (e) {
            if (!drop.contains(e.relatedTarget)) drop.classList.remove('drag-over');
        });
        drop.addEventListener('drop', function (e) {
            e.preventDefault();
            drop.classList.remove('drag-over');
            var files = e.dataTransfer && e.dataTransfer.files;
            if (files && files.length) processImageFile(files[0]);
        });

        input.addEventListener('change', function () {
            if (this.files && this.files.length) processImageFile(this.files[0]);
            this.value = '';
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                state.image = null;
                renderImagePreview();
                hideImgStatus();
            });
        }
    }

    /*
     * processImageFile
     * ────────────────
     * Hands the raw File to imageUtils.compressFile().
     * Shows a "processing" badge while the canvas
     * encodes, then shows size info or a warning if
     * the image had to be stored without compression.
     */
    function processImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showNotification('Please choose a valid image file (JPEG, PNG, WebP…).');
            return;
        }

        showImgStatus('processing', '⏳ Compressing image…');

        ImgUtil.compressFile(file, function (compressed) {
            if (compressed) {
                state.image = compressed;
                renderImagePreview();

                /* Show compressed size as friendly feedback */
                var kb = Math.round(compressed.length * 0.75 / 1024);
                showImgStatus('success', '✓ Image ready (' + kb + ' KB)');
            } else {
                /*
                 * compressFile returns null only when the image cannot
                 * be brought within MAX_BYTES even at minimum quality.
                 * This is extremely rare for normal photos.
                 */
                state.image = null;
                renderImagePreview();
                showImgStatus('warning', '⚠ Image too large to store — try a smaller file.');
                showNotification('Image could not be compressed to a storable size. Please use a smaller image.');
            }
        });
    }

    function renderImagePreview() {
        var drop     = document.getElementById('imageDrop');
        var inner    = document.getElementById('imagePreviewInner');
        var imgEl    = document.getElementById('imagePreviewEl');
        var clearBtn = document.getElementById('clearImgBtn');

        if (state.image) {
            imgEl.src           = state.image;
            imgEl.style.display = 'block';
            inner.style.display = 'none';
            drop.classList.add('has-image');
            if (clearBtn) clearBtn.style.display = 'inline-flex';
        } else {
            imgEl.src           = '';
            imgEl.style.display = 'none';
            inner.style.display = 'flex';
            drop.classList.remove('has-image');
            if (clearBtn) clearBtn.style.display = 'none';
        }
    }

    function showImgStatus(type, text) {
        var wrap = document.getElementById('imgStatus');
        var txt  = document.getElementById('imgStatusText');
        if (!wrap || !txt) return;
        wrap.className     = 'img-status ' + type;
        txt.textContent    = text;
        wrap.style.display = 'inline-flex';
    }
    function hideImgStatus() {
        var wrap = document.getElementById('imgStatus');
        if (wrap) wrap.style.display = 'none';
    }

    /* ══════════════════════════════════════════
       TAG WIDGET
    ══════════════════════════════════════════ */
    function createTagWidget(opts) {
        var chipsEl  = document.getElementById(opts.chipsId);
        var searchEl = document.getElementById(opts.searchId);
        var dropEl   = document.getElementById(opts.dropdownId);

        function renderChips() {
            chipsEl.innerHTML = '';
            opts.getSelected().forEach(function (val) {
                var chip = document.createElement('span');
                chip.className = 'chip';
                chip.appendChild(document.createTextNode(val));

                var btn = document.createElement('button');
                btn.type = 'button'; btn.className = 'chip-remove';
                btn.innerHTML = '&#10005;';
                btn.setAttribute('aria-label', 'Remove ' + val);
                btn.addEventListener('click', function () {
                    opts.setSelected(
                        opts.getSelected().filter(function (s) { return s !== val; })
                    );
                    renderChips(); renderDropdown(searchEl.value);
                });
                chip.appendChild(btn);
                chipsEl.appendChild(chip);
            });
        }

        function renderDropdown(query) {
            var q        = (query || '').toLowerCase().trim();
            var source   = opts.getSource();
            var selected = opts.getSelected();
            var filtered = source.filter(function (v) {
                return v.toLowerCase().indexOf(q) !== -1;
            });
            dropEl.innerHTML = '';

            if (!filtered.length) {
                var e = document.createElement('div');
                e.className = 'dropdown-empty';
                e.textContent = q ? ('No results for "' + query + '"') : 'Nothing available';
                dropEl.appendChild(e); return;
            }

            filtered.forEach(function (val) {
                var item = document.createElement('div');
                item.className   = 'dropdown-item';
                item.textContent = val;
                item.setAttribute('role', 'option');
                if (selected.indexOf(val) !== -1) {
                    item.classList.add('selected');
                    item.setAttribute('aria-selected', 'true');
                }
                item.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    if (selected.indexOf(val) !== -1) return;
                    opts.setSelected(selected.concat([val]));
                    renderChips(); renderDropdown(searchEl.value);
                });
                dropEl.appendChild(item);
            });
        }

        function openDrop()  { renderDropdown(searchEl.value); dropEl.classList.add('open'); }
        function closeDrop() { dropEl.classList.remove('open'); }

        searchEl.addEventListener('focus', openDrop);
        searchEl.addEventListener('input', function () { renderDropdown(this.value); });
        searchEl.addEventListener('blur',  function () { setTimeout(closeDrop, 160); });

        renderChips();
        return { renderChips: renderChips };
    }

    function rebuildWidget(chipsId, searchId, dropdownId, getSource, getSelected, setSelected) {
        createTagWidget({ chipsId:chipsId, searchId:searchId, dropdownId:dropdownId,
            getSource:getSource, getSelected:getSelected, setSelected:setSelected });
    }

    /* ── Region selector ─────────────────────── */
    function initRegionSelector() {
        var names = getRegionNames();
        showOrHide(names.length, 'noRegionHint', 'regionDropWrap');
        if (!names.length) return;
        createTagWidget({
            chipsId:'regionChips', searchId:'regionSearch', dropdownId:'regionDropdown',
            getSource:getRegionNames,
            getSelected:function ()  { return state.selectedRegions; },
            setSelected:function (v) { state.selectedRegions = v; }
        });
    }
    function getRegionNames() {
        return getStorageArray(STORAGE_REGIONS)
            .map(function (r) { return r.name || ''; }).filter(Boolean);
    }

    /* ── Prey selector ───────────────────────── */
    function initPreySelector() {
        var excludeId = editMode && editMonster ? editMonster.id : null;
        var names     = getExistingMonsterNames(excludeId);
        showOrHide(names.length, 'noPreyHint', 'preyDropWrap');
        if (!names.length) return;
        createTagWidget({
            chipsId:'preyChips', searchId:'preySearch', dropdownId:'preyDropdown',
            getSource:function () { return getExistingMonsterNames(excludeId); },
            getSelected:function ()  { return state.selectedPrey; },
            setSelected:function (v) { state.selectedPrey = v; }
        });
    }
    function getExistingMonsterNames(excludeId) {
        return getStorageArray(STORAGE_MONSTERS)
            .filter(function (m) { return m.id !== excludeId; })
            .map(function (m) { return m.name || ''; }).filter(Boolean);
    }

    function showOrHide(count, hintId, wrapId) {
        var h = document.getElementById(hintId);
        var w = document.getElementById(wrapId);
        if (h) h.style.display = count === 0 ? 'block' : 'none';
        if (w) w.style.display = count === 0 ? 'none'  : 'block';
    }

    /* ── Element tags ────────────────────────── */
    function initElementTags() {
        var grid = document.getElementById('elementsTagGrid');
        ELEMENTS.forEach(function (el) {
            var btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'element-tag';
            btn.textContent = el; btn.setAttribute('data-element', el);
            btn.setAttribute('aria-pressed', 'false');
            btn.addEventListener('click', function () {
                var key = this.getAttribute('data-element');
                if (state.activeElements[key]) {
                    delete state.activeElements[key];
                    this.classList.remove('active'); this.setAttribute('aria-pressed','false');
                } else {
                    state.activeElements[key] = true;
                    this.classList.add('active'); this.setAttribute('aria-pressed','true');
                }
            });
            grid.appendChild(btn);
        });
    }

    /* ── Dynamic lists ───────────────────────── */
    function initDynamicLists() {
        document.getElementById('addItemBtn') .addEventListener('click', function () { addItemRow();  });
        document.getElementById('addSkillBtn').addEventListener('click', function () { addSkillRow(); });
    }

    function addItemRow(name, rarity, difficulty) {
        var list = document.getElementById('itemsList');
        var row  = document.createElement('div');
        row.className = 'dynamic-row';
        row.innerHTML =
            '<div class="field-group"><label class="field-label">Item Name</label>' +
            '<input type="text" class="field-input item-name" placeholder="e.g. Fire Scale"></div>' +
            '<div class="field-group" style="max-width:110px;"><label class="field-label">Rarity</label>' +
            '<input type="text" class="field-input item-rarity" placeholder="Rare"></div>' +
            '<div class="field-group" style="max-width:80px;"><label class="field-label">Difficulty</label>' +
            '<input type="number" class="field-input item-difficulty" min="0" value="0"></div>' +
            '<button type="button" class="remove-row-btn" aria-label="Remove">&#10005;</button>';
        row.querySelector('.remove-row-btn').addEventListener('click', function () { row.remove(); });
        if (name       !== undefined) row.querySelector('.item-name').value       = name;
        if (rarity     !== undefined) row.querySelector('.item-rarity').value     = rarity;
        if (difficulty !== undefined) row.querySelector('.item-difficulty').value = difficulty;
        list.appendChild(row);
    }

    function addSkillRow(name, value) {
        var list = document.getElementById('extraSkillsList');
        var row  = document.createElement('div');
        row.className = 'dynamic-row';
        row.innerHTML =
            '<div class="field-group"><label class="field-label">Skill Name</label>' +
            '<input type="text" class="field-input extra-skill-name" placeholder="e.g. Perception"></div>' +
            '<div class="field-group" style="max-width:85px;"><label class="field-label">Value</label>' +
            '<input type="number" class="field-input extra-skill-value" min="0" value="0"></div>' +
            '<button type="button" class="remove-row-btn" aria-label="Remove">&#10005;</button>';
        row.querySelector('.remove-row-btn').addEventListener('click', function () { row.remove(); });
        if (name  !== undefined) row.querySelector('.extra-skill-name').value  = name;
        if (value !== undefined) row.querySelector('.extra-skill-value').value = value;
        list.appendChild(row);
    }

    /* ── Gather helpers ──────────────────────── */
    function gatherItems() {
        var items = [];
        document.querySelectorAll('#itemsList .dynamic-row').forEach(function (row) {
            var n = row.querySelector('.item-name').value.trim();
            if (!n) return;
            items.push({ name:n,
                rarity:    row.querySelector('.item-rarity').value.trim(),
                difficulty:parseInt(row.querySelector('.item-difficulty').value,10)||0 });
        });
        return items;
    }
    function gatherExtraSkills() {
        var s = {};
        document.querySelectorAll('#extraSkillsList .dynamic-row').forEach(function (row) {
            var n = row.querySelector('.extra-skill-name').value.trim();
            var v = parseInt(row.querySelector('.extra-skill-value').value,10)||0;
            if (n) s[n] = v;
        });
        return s;
    }
    function numVal(id) { return parseInt(document.getElementById(id).value,10)||0; }

    /* ══════════════════════════════════════════
       SAVE
       ──────────────────────────────────────────
       state.image is already a compressed
       data-URL (set by processImageFile) so we
       just write it directly.  The old
       QuotaExceededError fallback is kept as a
       last-resort safety net.
    ══════════════════════════════════════════ */
    function initSave() {
        document.getElementById('saveMonsterBtn').addEventListener('click', saveMonster);
    }

    function saveMonster() {
        var nameEl = document.getElementById('monsterName');
        var name   = nameEl.value.trim();
        if (!name) {
            nameEl.classList.add('input-error');
            setTimeout(function () { nameEl.classList.remove('input-error'); }, 2000);
            showNotification('Monster name is required.');
            nameEl.focus(); return;
        }

        var imageValue = (typeof state.image === 'string' && state.image.length > 0)
            ? state.image : null;

        var monster = {
            id:        editMode ? editMonster.id        : generateId(),
            createdAt: editMode ? editMonster.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name:name, alias:document.getElementById('monsterAlias').value.trim(),
            regions:state.selectedRegions.slice(),
            region:state.selectedRegions[0]||'',
            diet:document.getElementById('monsterDiet').value.trim(),
            prey:state.selectedPrey.slice(),
            appearance:document.getElementById('monsterAppearance').value.trim(),
            image:imageValue,
            skills:{
                physical:{ agility:numVal('statAgility'), strength:numVal('statStrength'), endurance:numVal('statEndurance') },
                magical:{ crafting:numVal('statCrafting'), impact:numVal('statImpact'), manipulation:numVal('statManipulation') },
                extra:gatherExtraSkills()
            },
            elements:Object.keys(state.activeElements),
            extractableItems:gatherItems()
        };

        var monsters = getStorageArray(STORAGE_MONSTERS);
        if (editMode) {
            var idx = monsters.findIndex(function (m) { return m.id === monster.id; });
            if (idx !== -1) monsters[idx] = monster; else monsters.push(monster);
        } else {
            monsters.push(monster);
        }

        try {
            localStorage.setItem(STORAGE_MONSTERS, JSON.stringify(monsters));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                /* Last-resort: drop the image and try again */
                monster.image = null;
                if (editMode) {
                    var i2 = monsters.findIndex(function (m) { return m.id === monster.id; });
                    if (i2 !== -1) monsters[i2] = monster;
                }
                try {
                    localStorage.setItem(STORAGE_MONSTERS, JSON.stringify(monsters));
                    showNotification('Storage full — saved without image.');
                } catch (e2) {
                    showNotification('Save failed: storage is completely full.');
                    console.error('[CreateMonster] storage full:', e2);
                    return;
                }
            } else {
                showNotification('Save failed: ' + e.message);
                console.error('[CreateMonster] save error:', e); return;
            }
        }

        if (editMode) syncRegionAssignments(monster);
        showNotification('✓ "' + name + '" ' + (editMode ? 'updated' : 'added to the Bestiary') + '!');
        setTimeout(function () { navigateTo('MonsterBook.html'); }, 1100);
    }

    function syncRegionAssignments(monster) {
        var regions = getStorageArray(STORAGE_REGIONS);
        var changed = false;
        regions.forEach(function (region) {
            if (!region.monsters) return;
            var inR = monster.regions.indexOf(region.name) !== -1;
            var exi = region.monsters.findIndex(function (rm) { return rm.id === monster.id; });
            if (inR && exi === -1) {
                region.monsters.push({ id:monster.id, name:monster.name, chanceDay:50, chanceNight:50, subAreas:[], subAreaScales:{} });
                changed = true;
            } else if (!inR && exi !== -1) {
                region.monsters.splice(exi, 1); changed = true;
            } else if (inR && exi !== -1) {
                region.monsters[exi].name = monster.name; changed = true;
            }
        });
        if (changed) localStorage.setItem(STORAGE_REGIONS, JSON.stringify(regions));
    }

    /* ══════════════════════════════════════════
       DELETE MODAL
    ══════════════════════════════════════════ */
    function initDeleteModal() {
        var deleteBtn  = document.getElementById('deleteMonsterBtn');
        var backdrop   = document.getElementById('deleteDialog');
        var cancelBtn  = document.getElementById('dialogCancel');
        var confirmBtn = document.getElementById('dialogConfirm');
        var bodyEl     = document.getElementById('deleteDialogBody');
        if (!deleteBtn || !backdrop) return;

        deleteBtn.addEventListener('click', function () {
            var n = editMonster && editMonster.name ? editMonster.name : 'this monster';
            if (bodyEl) bodyEl.textContent =
                'Delete "' + n + '"? This action is permanent and cannot be undone. ' +
                'The creature will be removed from all regions.';
            openModal();
        });
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal(); });
        if (confirmBtn) confirmBtn.addEventListener('click', function () { closeModal(); deleteMonster(); });
        document.addEventListener('keydown', function (e) {
            if (backdrop.style.display === 'none') return;
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        });
    }

    function openModal() {
        var b = document.getElementById('deleteDialog');
        if (!b) return;
        b.style.display = 'flex';
        document.body.classList.add('modal-open');
        var c = document.getElementById('dialogCancel');
        if (c) c.focus();
    }
    function closeModal() {
        var b = document.getElementById('deleteDialog');
        if (!b) return;
        b.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    function deleteMonster() {
        if (!editMonster) return;
        var id = editMonster.id; var name = editMonster.name || 'Monster';
        var monsters = getStorageArray(STORAGE_MONSTERS).filter(function (m) { return m.id !== id; });
        localStorage.setItem(STORAGE_MONSTERS, JSON.stringify(monsters));
        var regions = getStorageArray(STORAGE_REGIONS);
        regions.forEach(function (r) {
            if (r.monsters) r.monsters = r.monsters.filter(function (rm) { return rm.id !== id; });
        });
        localStorage.setItem(STORAGE_REGIONS, JSON.stringify(regions));
        showNotification('🗑 "' + name + '" has been deleted.');
        setTimeout(function () { navigateTo('MonsterBook.html'); }, 1000);
    }

    /* ══════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════ */
    function getStorageArray(key) {
        try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
        catch (e) { console.warn('[CreateMonster] read error', key, e); return []; }
    }
    function setVal(id, v) { var e = document.getElementById(id); if (e) e.value = v; }
    function setNum(id, v) { var e = document.getElementById(id); if (e) e.value = Number(v)||0; }
    function generateId() { return 'mon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }

    function navigateTo(url) {
        document.body.style.transition = 'opacity .35s ease-out';
        document.body.style.opacity    = '0';
        setTimeout(function () { window.location.href = url; }, 360);
    }
    function initBack() {
        var b = document.getElementById('backBtn');
        if (b) b.addEventListener('click', function () { navigateTo('MonsterBook.html'); });
    }

    function showNotification(msg) {
        var p = document.querySelector('.cm-toast'); if (p) p.remove();
        var t = document.createElement('div'); t.className = 'cm-toast'; t.textContent = msg;
        t.setAttribute('role','status'); t.setAttribute('aria-live','polite');
        Object.assign(t.style,{
            position:'fixed',bottom:'2rem',left:'50%',
            transform:'translateX(-50%) translateY(10px)',
            padding:'.75rem 1.6rem',backgroundColor:'rgba(74,47,24,.93)',color:'#e8dcc8',
            fontFamily:"'Cinzel',serif",fontSize:'.82rem',letterSpacing:'.07em',
            borderRadius:'4px',border:'1px solid rgba(204,159,56,.4)',
            boxShadow:'0 5px 16px rgba(74,47,24,.28)',zIndex:'300',opacity:'0',
            transition:'opacity .28s ease, transform .28s ease',
            pointerEvents:'none',maxWidth:'90vw',textAlign:'center'
        });
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
        setTimeout(function () {
            t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(10px)';
            setTimeout(function () { if (t.parentNode) t.remove(); }, 300);
        }, 2800);
    }

})();