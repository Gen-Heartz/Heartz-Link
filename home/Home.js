/* =============================================
   HEARTZ LINK – Home  (save/load rewrite)
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initHeartbeat();
    initKeyboardNav();
});

/* ── Routes ──────────────────────────────────── */

var ROUTES = {
    bestiary:   '../bestiary/Bestiary.html',
    characters: '../characters/Characters.html',
    system:     '../system/System.html',
    play:       '../play/Play.html',
    save:       null,
    load:       null
};

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            handleNavigation(this.getAttribute('data-page'));
        });
    });
}

function handleNavigation(page) {
    switch (page) {
        case 'save': handleSave(); break;
        case 'load': handleLoad(); break;
        default:
            if (ROUTES[page]) navigateTo(ROUTES[page]);
            else console.warn('[Home] Unknown page:', page);
    }
}

function navigateTo(url) {
    var c = document.querySelector('.container');
    c.style.transition = 'opacity .4s ease-out';
    c.style.opacity = '0';
    setTimeout(function () { window.location.href = url; }, 400);
}

/* ══════════════════════════════════════════════
   SAVE  –  export everything to a .json file
══════════════════════════════════════════════ */

/**
 * All storage keys that belong to Heartz Link.
 * Add more here as new modules are built.
 */
var STORAGE_KEYS = [
    'heartzlink_monsters',
    'heartzlink_regions',
    'heartzlink_sheet_templates',   /* ← add this */
    'heartzlink_character_sheets',   /* ← add this */
    'heartzlink_characters' /* ← add this */
];

function handleSave() {
    var payload = {
        __heartzlink: true,
        version:      '1.0.0',
        exportedAt:   new Date().toISOString(),
        data:         {}
    };

    STORAGE_KEYS.forEach(function (key) {
        var raw = localStorage.getItem(key);
        payload.data[key] = raw ? JSON.parse(raw) : [];
    });

    /* check there is something worth saving */
    var hasContent = STORAGE_KEYS.some(function (key) {
        return payload.data[key] && payload.data[key].length > 0;
    });
    if (!hasContent) {
        showNotification('Nothing to save yet. Create some content first.');
        return;
    }

    /* build and trigger download */
    var json     = JSON.stringify(payload, null, 2);
    var blob     = new Blob([json], { type: 'application/json' });
    var url      = URL.createObjectURL(blob);
    var anchor   = document.createElement('a');
    var filename = 'HeartzLink_Save_' + formatDateStamp() + '.json';

    anchor.href     = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    showNotification('✓  Saved as "' + filename + '"');
}

function formatDateStamp() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear()
        + pad(d.getMonth() + 1)
        + pad(d.getDate())
        + '_'
        + pad(d.getHours())
        + pad(d.getMinutes());
}

/* ══════════════════════════════════════════════
   LOAD  –  import from a .json file
══════════════════════════════════════════════ */

function handleLoad() {
    /* create a hidden <input type="file"> on the fly */
    var fileInput = document.createElement('input');
    fileInput.type    = 'file';
    fileInput.accept  = '.json,application/json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', function () {
        if (!this.files.length) { fileInput.remove(); return; }
        readSaveFile(this.files[0], function () { fileInput.remove(); });
    });

    fileInput.click();
}

function readSaveFile(file, cleanup) {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        showNotification('Please choose a valid .json save file.');
        cleanup();
        return;
    }

    var reader = new FileReader();

    reader.onload = function (e) {
        cleanup();
        var payload;

        /* ── parse ── */
        try {
            payload = JSON.parse(e.target.result);
        } catch (err) {
            showNotification('Could not parse file. Is it a valid JSON?');
            console.error('[Load] JSON parse error:', err);
            return;
        }

        /* ── validate ── */
        if (!payload || payload.__heartzlink !== true || !payload.data) {
            showNotification('File is not a Heartz Link save.');
            return;
        }

        /* ── restore (replace) ── */
        var count = 0;
        STORAGE_KEYS.forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(payload.data, key)) {
                localStorage.setItem(key, JSON.stringify(payload.data[key]));
                count++;
            }
        });

        showNotification('✓  Save loaded! (' + count + ' data sets restored)');
    };

    reader.onerror = function () {
        cleanup();
        showNotification('Failed to read file.');
    };

    reader.readAsText(file);
}

/* ══════════════════════════════════════════════
   HEARTBEAT  (title animation)
══════════════════════════════════════════════ */

function initHeartbeat() {
    var heart = document.querySelector('.title-heart');
    if (!heart) return;

    var style = document.createElement('style');
    style.textContent =
        '@keyframes heartbeat {' +
        '  0%,100%{ transform:scale(1);    }' +
        '  15%    { transform:scale(1.12); }' +
        '  30%    { transform:scale(1);    }' +
        '  45%    { transform:scale(1.06); }' +
        '  60%    { transform:scale(1);    }' +
        '}';
    document.head.appendChild(style);

    heart.style.animation = 'heartbeat 3s ease-in-out infinite';
    heart.style.display   = 'inline-block';
}

/* ══════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════ */

function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
        var buttons = document.querySelectorAll('.nav-btn');
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= buttons.length) {
            buttons[n - 1].click();
            buttons[n - 1].focus();
        }
    });
}

/* ══════════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════════ */

function showNotification(msg) {
    var prev = document.querySelector('.hl-toast');
    if (prev) prev.remove();

    var t = document.createElement('div');
    t.className = 'hl-toast';
    t.textContent = msg;

    Object.assign(t.style, {
        position:        'fixed',
        bottom:          '2rem',
        left:            '50%',
        transform:       'translateX(-50%) translateY(10px)',
        padding:         '.8rem 1.6rem',
        backgroundColor: 'rgba(74,47,24,.92)',
        color:           '#e8dcc8',
        fontFamily:      "'Cinzel',serif",
        fontSize:        '.83rem',
        letterSpacing:   '.07em',
        borderRadius:    '4px',
        border:          '1px solid rgba(204,159,56,.4)',
        boxShadow:       '0 5px 16px rgba(74,47,24,.28)',
        zIndex:          '100',
        opacity:         '0',
        transition:      'opacity .3s ease, transform .3s ease',
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
        setTimeout(function () { if (t.parentNode) t.remove(); }, 320);
    }, 3000);
}