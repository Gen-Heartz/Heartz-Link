/* =============================================
   HEARTZ LINK – Monsters by Region  (full rewrite)
   Fixes: all dropdowns, sub-areas, scaling,
          day/night, encounter range, bg image,
          loot difficulty shown on cards
   ============================================= */

(function () {
    'use strict';

    /* ── Storage keys ─────────────────────── */
    var S_MONSTERS = 'heartzlink_monsters';
    var S_REGIONS  = 'heartzlink_regions';

    /* ── Exploration state ────────────────── */
    var explore = {
        regionIdx:    -1,
        subArea:      '',
        isNight:      false,
        cards:        []        /* array of { monster, subArea, scale } */
    };

    /* ── Org state ────────────────────────── */
    var org = {
        selectedRegionIdx:   -1,
        pendingMonster:      null
    };

    /* ── New region image ─────────────────── */
    var newRegionImage = null;

    /* ══════════════════════════════════════
       BOOT
    ══════════════════════════════════════ */

    document.addEventListener('DOMContentLoaded', function () {
        initTabs();
        initBack();
        initOrgMode();
        initExploreMode();
    });

    /* ══════════════════════════════════════
       HELPERS – storage
    ══════════════════════════════════════ */

    function getMonsters() {
        try { return JSON.parse(localStorage.getItem(S_MONSTERS) || '[]'); }
        catch (e) { return []; }
    }
    function getRegions() {
        try { return JSON.parse(localStorage.getItem(S_REGIONS) || '[]'); }
        catch (e) { return []; }
    }
    function saveRegions(r) { localStorage.setItem(S_REGIONS, JSON.stringify(r)); }

    function findMonsterById(id) {
        return getMonsters().find(function (m) { return m.id === id; }) || null;
    }

    /* ══════════════════════════════════════
       HELPERS – searchable dropdown widget
    ══════════════════════════════════════ */

    function initSearchDrop(opts) {
        var input = document.getElementById(opts.inputId);
        var drop  = document.getElementById(opts.dropId);
        if (!input || !drop) return;

        function render(q) {
            q = (q || '').toLowerCase().trim();
            var items    = opts.getItems();
            var filtered = q
                ? items.filter(function (it) {
                    return it.label.toLowerCase().indexOf(q) !== -1;
                  })
                : items;

            drop.innerHTML = '';

            if (!filtered.length) {
                var e = document.createElement('div');
                e.className   = 'sd-empty';
                e.textContent = q ? 'No results for "' + q + '"' : 'Nothing available';
                drop.appendChild(e);
                return;
            }

            filtered.forEach(function (item) {
                var el = document.createElement('div');
                el.className = 'sd-item';

                if (item.image) {
                    var img = document.createElement('img');
                    img.src = item.image;
                    img.style.cssText =
                        'width:24px;height:24px;border-radius:3px;' +
                        'object-fit:cover;flex-shrink:0;';
                    el.appendChild(img);
                } else if (item.initial) {
                    var ini = document.createElement('span');
                    ini.style.cssText =
                        'width:24px;height:24px;border-radius:3px;' +
                        'background:rgba(74,47,24,.08);' +
                        'display:flex;align-items:center;justify-content:center;' +
                        'flex-shrink:0;font-family:\'Cinzel\',serif;' +
                        'font-size:.7rem;font-weight:700;' +
                        'color:#4a2f18;opacity:.5;';
                    ini.textContent = item.initial;
                    el.appendChild(ini);
                }

                var txt = document.createElement('span');
                txt.textContent = item.label;
                el.appendChild(txt);

                el.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    opts.onSelect(item);
                    if (opts.closeOnSelect !== false) {
                        drop.classList.remove('open');
                        input.value = '';
                    }
                });
                drop.appendChild(el);
            });
        }

        input.addEventListener('focus', function () {
            render(this.value);
            drop.classList.add('open');
        });
        input.addEventListener('input', function () { render(this.value); });
        input.addEventListener('blur',  function () {
            setTimeout(function () { drop.classList.remove('open'); }, 180);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                drop.classList.remove('open');
                input.blur();
            }
        });
    }

    /* ══════════════════════════════════════
       TABS
    ══════════════════════════════════════ */

    function initTabs() {
        var tabs = document.querySelectorAll('.mode-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                this.classList.add('active');
                var mode = this.getAttribute('data-mode');
                document.getElementById('panelOrganize').style.display =
                    mode === 'organize' ? '' : 'none';
                document.getElementById('panelExplore').style.display  =
                    mode === 'explore'  ? '' : 'none';
            });
        });
    }

    function initBack() {
        var btn = document.getElementById('backBtn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            document.body.style.transition = 'opacity .35s';
            document.body.style.opacity    = '0';
            setTimeout(function () {
                window.location.href = 'Bestiary.html';
            }, 360);
        });
    }

    /* ══════════════════════════════════════════════════════════
       ORGANIZATION MODE
    ══════════════════════════════════════════════════════════ */

    function initOrgMode() {
        initRegionImagePick();

        document.getElementById('createRegionBtn').addEventListener('click', createRegion);
        document.getElementById('newRegionName').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); createRegion(); }
        });
        document.getElementById('closeEditorBtn').addEventListener('click', closeEditor);
        document.getElementById('addSubAreaBtn').addEventListener('click', addSubArea);
        document.getElementById('newSubAreaName').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); addSubArea(); }
        });
        document.getElementById('confirmAssignBtn').addEventListener('click', confirmAssign);

        initSearchDrop({
            inputId:  'assignMonsterSearch',
            dropId:   'assignMonsterDrop',
            getItems: function () {
                return getMonsters().map(function (m) {
                    return {
                        id:      m.id,
                        label:   m.name || 'Unnamed',
                        image:   m.image || null,
                        initial: (m.name || '?').charAt(0).toUpperCase()
                    };
                });
            },
            onSelect: function (item) {
                var monster = findMonsterById(item.id);
                if (!monster) return;
                org.pendingMonster = monster;
                document.getElementById('assignMonsterSearch').value = monster.name;
                renderAssignConfig();
            },
            closeOnSelect: true
        });

        renderRegionList();
    }

    /* ── New-region image pick ────────────── */

    function initRegionImagePick() {
        var pick  = document.getElementById('regionImgPick');
        var input = document.getElementById('regionImgInput');
        pick.addEventListener('click', function () { input.click(); });
        input.addEventListener('change', function () {
            if (!this.files || !this.files.length) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                newRegionImage = e.target.result;
                document.getElementById('regionImgIcon').style.display = 'none';
                var prev = document.getElementById('regionImgPreview');
                prev.src = newRegionImage;
                prev.style.display = 'block';
            };
            reader.readAsDataURL(this.files[0]);
            this.value = '';
        });
    }

    /* ── Create region ────────────────────── */

    function createRegion() {
        var nameEl = document.getElementById('newRegionName');
        var name   = nameEl.value.trim();
        if (!name) { showToast('Enter a region name.'); return; }

        var regions = getRegions();
        if (regions.some(function (r) {
            return r.name.toLowerCase() === name.toLowerCase();
        })) {
            showToast('Region "' + name + '" already exists.');
            return;
        }

        regions.push({ name: name, image: newRegionImage, subAreas: [], monsters: [] });
        saveRegions(regions);

        nameEl.value   = '';
        newRegionImage = null;
        document.getElementById('regionImgIcon').style.display      = '';
        document.getElementById('regionImgPreview').style.display   = 'none';
        document.getElementById('regionImgPreview').src              = '';

        renderRegionList();
        showToast('Region "' + name + '" created.');
    }

    /* ── Region list ──────────────────────── */

    function renderRegionList() {
        var container = document.getElementById('regionList');
        var regions   = getRegions();
        container.innerHTML = '';

        if (!regions.length) {
            container.innerHTML =
                '<p style="text-align:center;opacity:.4;font-style:italic;' +
                'padding:.8rem;">No regions yet.</p>';
            return;
        }

        regions.forEach(function (region, idx) {
            var item = document.createElement('div');
            item.className =
                'region-item' + (idx === org.selectedRegionIdx ? ' active' : '');

            var thumb = document.createElement('div');
            thumb.className = 'region-thumb';
            if (region.image) {
                thumb.innerHTML = '<img src="' + region.image + '" alt="">';
            } else {
                thumb.textContent = (region.name || '?').charAt(0).toUpperCase();
            }

            var info    = document.createElement('div');
            info.className = 'region-info';
            var mn = (region.monsters || []).length;
            var sa = (region.subAreas  || []).length;
            info.innerHTML =
                '<div class="region-name">'  + escHtml(region.name) + '</div>' +
                '<div class="region-meta">'  + mn + ' monster' + (mn !== 1 ? 's' : '') +
                ' &bull; ' + sa + ' sub-area' + (sa !== 1 ? 's' : '') + '</div>';

            var del = document.createElement('button');
            del.type = 'button'; del.className = 'btn-danger region-del';
            del.innerHTML = '&#10005;';
            del.addEventListener('click', function (e) {
                e.stopPropagation(); deleteRegion(idx);
            });

            item.addEventListener('click', function () { openEditor(idx); });
            item.appendChild(thumb);
            item.appendChild(info);
            item.appendChild(del);
            container.appendChild(item);
        });
    }

    function deleteRegion(idx) {
        var regions = getRegions();
        var name    = regions[idx].name;
        regions.splice(idx, 1);
        saveRegions(regions);
        if (org.selectedRegionIdx === idx) closeEditor();
        else if (org.selectedRegionIdx > idx) org.selectedRegionIdx--;
        renderRegionList();
        showToast('Region "' + name + '" deleted.');
    }

    /* ── Editor open / close ──────────────── */

    function openEditor(idx) {
        org.selectedRegionIdx = idx;
        org.pendingMonster    = null;
        var region = getRegions()[idx];
        document.getElementById('editorRegionName').textContent = region.name;
        document.getElementById('regionEditor').style.display   = '';
        document.getElementById('assignConfig').style.display   = 'none';
        document.getElementById('assignMonsterSearch').value    = '';
        renderSubAreaList();
        renderAssignedList();
        renderRegionList();
    }

    function closeEditor() {
        org.selectedRegionIdx = -1;
        org.pendingMonster    = null;
        document.getElementById('regionEditor').style.display = 'none';
        renderRegionList();
    }

    /* ── Sub-areas ────────────────────────── */

    function addSubArea() {
        if (org.selectedRegionIdx < 0) return;
        var inp  = document.getElementById('newSubAreaName');
        var name = inp.value.trim();
        if (!name) { showToast('Enter a sub-area name.'); return; }

        var regions = getRegions();
        var region  = regions[org.selectedRegionIdx];
        if (!region.subAreas) region.subAreas = [];
        if (region.subAreas.some(function (s) {
            return s.toLowerCase() === name.toLowerCase();
        })) {
            showToast('Sub-area already exists.'); return;
        }

        region.subAreas.push(name);
        saveRegions(regions);
        inp.value = '';
        renderSubAreaList();
        if (org.pendingMonster) renderAssignConfig();
        showToast('Sub-area "' + name + '" added.');
    }

    function deleteSubArea(subAreaName) {
        var regions = getRegions();
        var region  = regions[org.selectedRegionIdx];
        region.subAreas = (region.subAreas || []).filter(function (s) {
            return s !== subAreaName;
        });
        (region.monsters || []).forEach(function (am) {
            if (am.subAreaScales) delete am.subAreaScales[subAreaName];
            am.subAreas = (am.subAreas || []).filter(function (s) { return s !== subAreaName; });
        });
        saveRegions(regions);
        renderSubAreaList();
        renderAssignedList();
        if (org.pendingMonster) renderAssignConfig();
    }

    function renderSubAreaList() {
        var container = document.getElementById('subAreaList');
        var regions   = getRegions();
        if (org.selectedRegionIdx < 0 || !regions[org.selectedRegionIdx]) {
            container.innerHTML = ''; return;
        }
        var subAreas = regions[org.selectedRegionIdx].subAreas || [];
        container.innerHTML = '';

        if (!subAreas.length) {
            container.innerHTML =
                '<p style="opacity:.4;font-style:italic;font-size:.82rem;">No sub-areas yet.</p>';
            return;
        }

        subAreas.forEach(function (sa) {
            var row = document.createElement('div');
            row.className = 'sub-area-row';

            var nameEl = document.createElement('span');
            nameEl.className   = 'sub-area-name';
            nameEl.textContent = sa;

            var del = document.createElement('button');
            del.type = 'button'; del.className = 'btn-danger sub-area-del';
            del.innerHTML = '&#10005;';
            del.addEventListener('click', function () { deleteSubArea(sa); });

            row.appendChild(nameEl);
            row.appendChild(del);
            container.appendChild(row);
        });
    }

    /* ── Assign config ────────────────────── */

    function renderAssignConfig() {
        var m = org.pendingMonster;
        if (!m) { document.getElementById('assignConfig').style.display = 'none'; return; }

        document.getElementById('assignConfig').style.display    = '';
        document.getElementById('assignConfigName').textContent  = m.name || 'Unnamed';

        var region   = getRegions()[org.selectedRegionIdx];
        var subAreas = (region && region.subAreas) ? region.subAreas : [];
        var wrap     = document.getElementById('subAreaCheckList');
        wrap.innerHTML = '';

        document.getElementById('subAreaAssignWrap').style.display = '';

        if (!subAreas.length) {
            wrap.innerHTML =
                '<p style="opacity:.4;font-style:italic;font-size:.8rem;">' +
                'No sub-areas defined for this region.</p>';
            return;
        }

        subAreas.forEach(function (sa) {
            var row = document.createElement('div');
            row.className = 'sub-area-check-row';

            var cb = document.createElement('input');
            cb.type = 'checkbox'; cb.value = sa;
            cb.id   = 'sacb_' + sa.replace(/\W/g, '_');

            var lbl = document.createElement('label');
            lbl.className   = 'sub-area-check-label';
            lbl.htmlFor     = cb.id;
            lbl.textContent = sa;

            var scaleWrap = document.createElement('div');
            scaleWrap.className = 'scale-inp-wrap';
            scaleWrap.appendChild(document.createTextNode('Scale '));

            var scaleInp = document.createElement('input');
            scaleInp.type      = 'number'; scaleInp.className = 'scale-inp';
            scaleInp.min       = '0'; scaleInp.max = '500'; scaleInp.value = '0';
            scaleInp.title     = 'Attribute scale % bonus';
            scaleWrap.appendChild(scaleInp);
            scaleWrap.appendChild(document.createTextNode('%'));

            row.appendChild(cb);
            row.appendChild(lbl);
            row.appendChild(scaleWrap);
            wrap.appendChild(row);
        });
    }

    function confirmAssign() {
        var m = org.pendingMonster;
        if (!m || org.selectedRegionIdx < 0) return;

        var regions = getRegions();
        var region  = regions[org.selectedRegionIdx];
        if (!region.monsters) region.monsters = [];

        if (region.monsters.find(function (am) { return am.id === m.id; })) {
            showToast('"' + m.name + '" is already assigned.'); return;
        }

        var chanceDay   = parseInt(document.getElementById('assignDay').value,   10) || 50;
        var chanceNight = parseInt(document.getElementById('assignNight').value,  10) || 50;

        var subAreas      = [];
        var subAreaScales = {};
        document.querySelectorAll('#subAreaCheckList input[type="checkbox"]')
            .forEach(function (cb) {
                if (!cb.checked) return;
                var sa       = cb.value;
                var row      = cb.closest('.sub-area-check-row');
                var scaleInp = row ? row.querySelector('.scale-inp') : null;
                subAreas.push(sa);
                subAreaScales[sa] = scaleInp ? (parseInt(scaleInp.value, 10) || 0) : 0;
            });

        region.monsters.push({
            id: m.id, name: m.name,
            chanceDay: chanceDay, chanceNight: chanceNight,
            subAreas: subAreas, subAreaScales: subAreaScales
        });
        saveRegions(regions);

        org.pendingMonster = null;
        document.getElementById('assignConfig').style.display   = 'none';
        document.getElementById('assignMonsterSearch').value    = '';
        renderAssignedList();
        renderRegionList();
        showToast('"' + m.name + '" assigned.');
    }

    /* ── Assigned list ────────────────────── */

    function renderAssignedList() {
        var container = document.getElementById('assignedList');
        var regions   = getRegions();
        if (org.selectedRegionIdx < 0 || !regions[org.selectedRegionIdx]) {
            container.innerHTML = ''; return;
        }
        var region = regions[org.selectedRegionIdx];
        var list   = region.monsters || [];
        container.innerHTML = '';

        if (!list.length) {
            container.innerHTML =
                '<p style="opacity:.4;font-style:italic;font-size:.85rem;">' +
                'No monsters assigned.</p>';
            return;
        }

        list.forEach(function (am, idx) {
            var entry = document.createElement('div');
            entry.className = 'assigned-entry';

            var header = document.createElement('div');
            header.className = 'assigned-entry-header';
            header.innerHTML =
                '<span class="ae-name">' + escHtml(am.name) + '</span>' +
                '<span class="ae-meta">&#9728;' + (am.chanceDay || 50) +
                '% &#9790;' + (am.chanceNight || 50) + '%</span>' +
                '<span class="ae-toggle">&#8250;</span>';

            var body = document.createElement('div');
            body.className = 'assigned-entry-body';

            body.innerHTML =
                '<div class="ae-chance-row">' +
                    '<label class="chance-lbl">&#9728; Day % ' +
                        '<input type="number" class="chance-inp ae-day" ' +
                        'value="' + (am.chanceDay || 50) + '" min="0" max="100">' +
                    '</label>' +
                    '<label class="chance-lbl">&#9790; Night % ' +
                        '<input type="number" class="chance-inp ae-night" ' +
                        'value="' + (am.chanceNight || 50) + '" min="0" max="100">' +
                    '</label>' +
                '</div>';

            var subAreas = region.subAreas || [];
            if (subAreas.length) {
                var saHdr = document.createElement('p');
                saHdr.style.cssText =
                    'font-size:.72rem;opacity:.6;font-style:italic;margin-bottom:.3rem;';
                saHdr.textContent = 'Sub-area scales:';
                body.appendChild(saHdr);

                subAreas.forEach(function (sa) {
                    var assigned = (am.subAreas || []).indexOf(sa) !== -1;
                    var scale    = (am.subAreaScales && am.subAreaScales[sa]) || 0;
                    var saRow    = document.createElement('div');
                    saRow.className = 'ae-sub-row';
                    saRow.innerHTML =
                        '<input type="checkbox" ' + (assigned ? 'checked' : '') +
                            ' data-sa="' + escHtml(sa) + '" class="ae-sa-cb"' +
                            ' style="accent-color:var(--gold);width:13px;height:13px;">' +
                        '<span class="ae-sub-name">' + escHtml(sa) + '</span>' +
                        '<div class="scale-inp-wrap">Scale ' +
                            '<input type="number" class="scale-inp ae-scale"' +
                            ' data-sa="' + escHtml(sa) + '"' +
                            ' min="0" max="500" value="' + scale + '"> %' +
                        '</div>';
                    body.appendChild(saRow);
                });
            }

            var saveBtn = document.createElement('button');
            saveBtn.type = 'button'; saveBtn.className = 'btn-gold';
            saveBtn.style.marginTop = '.6rem'; saveBtn.textContent = '✓ Save changes';
            saveBtn.addEventListener('click', function () {
                saveAssignedEdits(idx, body);
            });
            body.appendChild(saveBtn);

            var delBtn = document.createElement('button');
            delBtn.type = 'button'; delBtn.className = 'btn-danger';
            delBtn.style.marginTop = '.4rem'; delBtn.textContent = '✕ Remove';
            delBtn.addEventListener('click', function () { removeAssigned(idx); });
            body.appendChild(delBtn);

            var toggle = header.querySelector('.ae-toggle');
            header.addEventListener('click', function () {
                var open = body.classList.toggle('open');
                toggle.classList.toggle('open', open);
            });

            entry.appendChild(header);
            entry.appendChild(body);
            container.appendChild(entry);
        });
    }

    function saveAssignedEdits(monIdx, bodyEl) {
        var regions = getRegions();
        var region  = regions[org.selectedRegionIdx];
        var am      = region.monsters[monIdx];

        am.chanceDay   = parseInt(bodyEl.querySelector('.ae-day').value,   10) || 50;
        am.chanceNight = parseInt(bodyEl.querySelector('.ae-night').value,  10) || 50;
        am.subAreas      = [];
        am.subAreaScales = {};

        bodyEl.querySelectorAll('.ae-sa-cb').forEach(function (cb) {
            var sa = cb.getAttribute('data-sa');
            if (cb.checked) {
                am.subAreas.push(sa);
                var scaleInp = bodyEl.querySelector('.ae-scale[data-sa="' + sa + '"]');
                am.subAreaScales[sa] = scaleInp ? (parseInt(scaleInp.value, 10) || 0) : 0;
            }
        });

        saveRegions(regions);
        renderAssignedList();
        renderRegionList();
        showToast('Changes saved.');
    }

    function removeAssigned(monIdx) {
        var regions = getRegions();
        var region  = regions[org.selectedRegionIdx];
        var name    = region.monsters[monIdx].name;
        region.monsters.splice(monIdx, 1);
        saveRegions(regions);
        renderAssignedList();
        renderRegionList();
        showToast('"' + name + '" removed.');
    }

    /* ══════════════════════════════════════════════════════════
       EXPLORATION MODE
    ══════════════════════════════════════════════════════════ */

    function initExploreMode() {
        initSearchDrop({
            inputId:  'exploreRegionSearch',
            dropId:   'exploreRegionDrop',
            getItems: function () {
                return getRegions().map(function (r, i) {
                    return {
                        idx:     i,
                        label:   r.name,
                        image:   r.image || null,
                        initial: (r.name || '?').charAt(0).toUpperCase()
                    };
                });
            },
            onSelect: function (item) {
                document.getElementById('exploreRegionSearch').value = item.label;
                selectExploreRegion(item.idx);
            },
            closeOnSelect: true
        });

        document.getElementById('exploreSubAreaSelect').addEventListener('change', function () {
            explore.subArea = this.value;
        });

        var toggle = document.getElementById('dayNightToggle');
        toggle.addEventListener('click', toggleDayNight);
        toggle.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleDayNight(); }
        });

        document.getElementById('adventureBtn').addEventListener('click', adventure);

        document.getElementById('clearBtn').addEventListener('click', function () {
            explore.cards = [];
            renderCards();
        });

        initSearchDrop({
            inputId:  'addExtraSearch',
            dropId:   'addExtraDrop',
            getItems: function () {
                return getMonsters().map(function (m) {
                    return {
                        id:      m.id,
                        label:   m.name || 'Unnamed',
                        image:   m.image || null,
                        initial: (m.name || '?').charAt(0).toUpperCase()
                    };
                });
            },
            onSelect: function (item) {
                var m = findMonsterById(item.id);
                if (!m) return;
                explore.cards.push({ monster: m, subArea: '', scale: 0 });
                renderCards();
                document.getElementById('addExtraSearch').value = '';
                showToast('"' + m.name + '" added.');
            },
            closeOnSelect: true
        });
    }

    /* ── Select region ────────────────────── */

    function selectExploreRegion(idx) {
        explore.regionIdx = idx;
        explore.cards     = [];
        explore.subArea   = '';

        var region = getRegions()[idx];
        if (!region) return;

        var bg = document.getElementById('arenaBg');
        if (region.image) {
            bg.style.backgroundImage = 'url(' + region.image + ')';
        } else {
            bg.style.backgroundImage  = 'none';
            bg.style.backgroundColor  = 'rgba(74,47,24,.12)';
        }

        document.getElementById('arenaTitle').textContent = region.name;

        var sel = document.getElementById('exploreSubAreaSelect');
        sel.innerHTML = '<option value="">— All sub-areas —</option>';
        (region.subAreas || []).forEach(function (sa) {
            var opt = document.createElement('option');
            opt.value = sa; opt.textContent = sa;
            sel.appendChild(opt);
        });
        document.getElementById('subAreaControlGroup').style.display =
            (region.subAreas && region.subAreas.length) ? '' : 'none';

        document.getElementById('arena').style.display         = '';
        document.getElementById('adventureBtn').disabled       = false;

        applyNightVisuals();
        renderCards();
    }

    /* ── Day / Night ──────────────────────── */

    function toggleDayNight() {
        explore.isNight = !explore.isNight;
        var toggle = document.getElementById('dayNightToggle');
        toggle.classList.toggle('night', explore.isNight);
        toggle.setAttribute('aria-checked', String(explore.isNight));
        applyNightVisuals();
    }

    function applyNightVisuals() {
        document.getElementById('arenaBg').classList.toggle('night-filter', explore.isNight);
        document.getElementById('arenaNightVeil').classList.toggle('active', explore.isNight);
    }

    /* ── Adventure ────────────────────────── */

    function adventure() {
        if (explore.regionIdx < 0) return;

        var minVal = parseInt(document.getElementById('rangeMin').value, 10) || 1;
        var maxVal = parseInt(document.getElementById('rangeMax').value, 10) || 1;
        if (minVal > maxVal) { var tmp = minVal; minVal = maxVal; maxVal = tmp; }
        var count  = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));

        var region = getRegions()[explore.regionIdx];
        var pool   = buildEncounterPool(region);

        if (!pool.length) {
            showToast('No monsters match the current filters.');
            explore.cards = []; renderCards(); return;
        }

        var picked = [];
        for (var i = 0; i < count; i++) {
            picked.push(pool[Math.floor(Math.random() * pool.length)]);
        }

        explore.cards = picked;
        renderCards();
        showToast(
            (explore.isNight ? '🌙 Night' : '☀️ Day') +
            ' encounter — ' + picked.length +
            ' creature' + (picked.length !== 1 ? 's' : '') + '!'
        );
    }

    function buildEncounterPool(region) {
        var all       = getMonsters();
        var assigned  = region.monsters || [];
        var subFilter = explore.subArea;
        var pool      = [];

        assigned.forEach(function (am) {
            var chance = explore.isNight
                ? (am.chanceNight || 50)
                : (am.chanceDay   || 50);

            if (subFilter) {
                if ((am.subAreas || []).indexOf(subFilter) === -1) return;
                if (Math.random() * 100 >= chance) return;
                var scale = (am.subAreaScales && am.subAreaScales[subFilter]) || 0;
                var m = all.find(function (x) { return x.id === am.id; });
                if (m) pool.push({ monster: m, subArea: subFilter, scale: scale });
            } else {
                if (Math.random() * 100 >= chance) return;
                var subs = am.subAreas || [];
                var sa   = subs.length
                    ? subs[Math.floor(Math.random() * subs.length)]
                    : '';
                var sc   = (sa && am.subAreaScales && am.subAreaScales[sa])
                    ? am.subAreaScales[sa] : 0;
                var m2 = all.find(function (x) { return x.id === am.id; });
                if (m2) pool.push({ monster: m2, subArea: sa, scale: sc });
            }
        });

        return pool;
    }

    /* ── Apply scale ──────────────────────── */

    function applyScale(value, scalePct) {
        if (!scalePct) return value;
        return Math.round(value * (1 + scalePct / 100));
    }

    /* ── Render cards ─────────────────────── */

    function renderCards() {
        var grid = document.getElementById('cardsGrid');
        grid.innerHTML = '';

        if (!explore.cards.length) {
            var msg = document.createElement('p');
            msg.style.cssText =
                'text-align:center;color:#e8dcc8;opacity:.5;font-style:italic;' +
                'grid-column:1/-1;padding:2rem;';
            msg.textContent = 'Press "Adventure!" to encounter creatures.';
            grid.appendChild(msg);
            return;
        }

        explore.cards.forEach(function (entry, idx) {
            grid.appendChild(buildCard(entry, idx));
        });
    }

    /* ─────────────────────────────────────────────────────────
       buildCard
       ─────────────────────────────────────────────────────────
       FIX: loot rows now show  Name · Rarity · Difficulty: N
            sourced directly from item.difficulty on the object
            stored in monster.extractableItems[].
    ───────────────────────────────────────────────────────── */
    function buildCard(entry, idx) {
        var m     = entry.monster;
        var scale = entry.scale || 0;

        /* ── stats ── */
        var phys  = (m.skills && m.skills.physical) || {};
        var mag   = (m.skills && m.skills.magical)  || {};
        var extra = (m.skills && m.skills.extra)     || {};

        var stats = [
            { label: 'AGI', raw: phys.agility     || 0 },
            { label: 'STR', raw: phys.strength     || 0 },
            { label: 'END', raw: phys.endurance    || 0 },
            { label: 'CRF', raw: mag.crafting      || 0 },
            { label: 'IMP', raw: mag.impact        || 0 },
            { label: 'MNP', raw: mag.manipulation  || 0 }
        ];
        Object.keys(extra).forEach(function (k) {
            stats.push({ label: k.slice(0, 3).toUpperCase(), raw: extra[k] || 0 });
        });

        var statsHtml = stats.map(function (s) {
            var boosted   = applyScale(s.raw, scale);
            var isBoosted = scale > 0 && boosted !== s.raw;
            return (
                '<div class="card-stat' + (isBoosted ? ' boosted' : '') + '">' +
                    '<div class="card-stat-val">' + boosted + '</div>' +
                    '<div class="card-stat-lbl">' + escHtml(s.label) + '</div>' +
                '</div>'
            );
        }).join('');

        /* ── elements ── */
        var elems    = Array.isArray(m.elements)
            ? m.elements
            : Object.keys(m.elements || {});
        var elemHtml = elems.map(function (el) {
            return '<span class="card-el-tag">' + escHtml(el) + '</span>';
        }).join('');

        /* ── loot ──────────────────────────────────────────────────
           Each item stored by CreateMonster.js has the shape:
             { name: string, rarity: string, difficulty: number }

           We render all three fields so the user can see at a glance
           what the item is, how rare it is, and how hard it is to
           extract (the difficulty value set on the creation form).
        ─────────────────────────────────────────────────────────── */
        var items    = m.extractableItems || [];
        var lootHtml = '';

        if (items.length) {
            var rowsHtml = items.map(function (item) {
                /* Safely coerce difficulty to a display string */
                var diffVal = (item.difficulty !== undefined && item.difficulty !== null)
                    ? item.difficulty
                    : '—';

                return (
                    '<div class="card-loot-item">' +
                        '<span class="loot-item-name">'  + escHtml(item.name   || '?') + '</span>' +
                        '<span class="loot-item-rarity">' + escHtml(item.rarity || '?') + '</span>' +
                        '<span class="loot-item-diff">'  +
                            'Diff:&nbsp;' + escHtml(String(diffVal)) +
                        '</span>' +
                    '</div>'
                );
            }).join('');

            lootHtml =
                '<div class="card-loot">' +
                    '<div class="card-loot-title">Loot</div>' +
                    rowsHtml +
                '</div>';
        }

        /* ── sub-area badge ── */
        var subBadge = entry.subArea
            ? ('<div class="card-subarea-badge"><span>&#128205; ' +
               escHtml(entry.subArea) +
               (scale ? ' +' + scale + '%' : '') +
               '</span></div>')
            : '';

        /* ── image ── */
        var imgHtml = m.image
            ? '<img src="' + m.image + '" alt="' + escHtml(m.name || '') + '">'
            : '<span class="card-img-placeholder">' +
              escHtml((m.name || '?').charAt(0).toUpperCase()) + '</span>';

        /* ── assemble card ── */
        var card = document.createElement('div');
        card.className         = 'monster-card';
        card.style.animationDelay = (idx * 0.07) + 's';

        card.innerHTML =
            '<button class="card-remove" type="button"' +
                ' data-idx="' + idx + '" aria-label="Remove">&#10005;</button>' +
            '<div class="card-frame">' +
                '<div class="card-image">' + imgHtml + '</div>' +
                '<div class="card-body">' +
                    '<div class="card-name">' + escHtml(m.name || 'Unknown') + '</div>' +
                    (m.alias
                        ? '<div class="card-alias">"' + escHtml(m.alias) + '"</div>'
                        : '') +
                    subBadge +
                    '<div class="card-stats">' + statsHtml + '</div>' +
                    (elemHtml
                        ? '<div class="card-elements">' + elemHtml + '</div>'
                        : '') +
                    lootHtml +
                '</div>' +
            '</div>';

        card.querySelector('.card-remove').addEventListener('click', function (e) {
            e.stopPropagation();
            explore.cards.splice(
                parseInt(this.getAttribute('data-idx'), 10), 1
            );
            renderCards();
        });

        return card;
    }

    /* ══════════════════════════════════════
       UTILITIES
    ══════════════════════════════════════ */

    function escHtml(str) {
        return String(str || '')
            .replace(/&/g,  '&amp;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;')
            .replace(/"/g,  '&quot;')
            .replace(/'/g,  '&#39;');
    }

    function showToast(msg) {
        var prev = document.querySelector('.mbr-toast');
        if (prev) prev.remove();

        var t = document.createElement('div');
        t.className   = 'mbr-toast';
        t.textContent = msg;
        Object.assign(t.style, {
            position:        'fixed',
            bottom:          '2rem',
            left:            '50%',
            transform:       'translateX(-50%) translateY(10px)',
            padding:         '.7rem 1.5rem',
            backgroundColor: 'rgba(74,47,24,.93)',
            color:           '#e8dcc8',
            fontFamily:      "'Cinzel',serif",
            fontSize:        '.82rem',
            letterSpacing:   '.07em',
            borderRadius:    '4px',
            border:          '1px solid rgba(204,159,56,.4)',
            boxShadow:       '0 5px 16px rgba(74,47,24,.28)',
            zIndex:          '200',
            opacity:         '0',
            transition:      'opacity .28s ease, transform .28s ease',
            pointerEvents:   'none',
            maxWidth:        '90vw',
            textAlign:       'center'
        });
        document.body.appendChild(t);

        requestAnimationFrame(function () {
            t.style.opacity   = '1';
            t.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(function () {
            t.style.opacity   = '0';
            t.style.transform = 'translateX(-50%) translateY(10px)';
            setTimeout(function () { if (t.parentNode) t.remove(); }, 300);
        }, 2600);
    }

})();