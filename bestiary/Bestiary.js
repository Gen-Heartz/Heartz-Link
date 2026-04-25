/* =============================================
   HEARTZ LINK - Bestiary Hub Logic
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initBackButton();
    initKeyboardNav();
});

var ROUTES = {
    'monster-book':       'MonsterBook.html',
    'create-monster':     'CreateMonster.html',
    'monsters-by-region': 'MonstersByRegion.html'
};

var HOME_PATH = '../home/Home.html';

function initNavigation() {
    document.querySelectorAll('.nav-btn[data-page]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            navigateTo(ROUTES[this.getAttribute('data-page')]);
        });
    });
}

function initBackButton() {
    var b = document.getElementById('backBtn');
    if (b) b.addEventListener('click', function () { navigateTo(HOME_PATH); });
}

function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
        var btns = document.querySelectorAll('.nav-btn[data-page]');
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= btns.length) { btns[n - 1].click(); return; }
        if (e.key === 'Escape' || e.key === 'Backspace') navigateTo(HOME_PATH);
    });
}

function navigateTo(url) {
    var c = document.querySelector('.container');
    c.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    c.style.opacity = '0';
    c.style.transform = 'translateY(8px)';
    setTimeout(function () { window.location.href = url; }, 400);
}

function showNotification(msg) {
    var ex = document.querySelector('.notification');
    if (ex) ex.remove();
    var t = document.createElement('div');
    t.className = 'notification';
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', bottom: '2rem', left: '50%',
        transform: 'translateX(-50%) translateY(10px)',
        padding: '0.75rem 1.5rem',
        backgroundColor: 'rgba(74,47,24,0.92)', color: '#beb191',
        fontFamily: "'Cinzel',serif", fontSize: '0.82rem',
        letterSpacing: '0.08em', borderRadius: '4px',
        border: '1px solid rgba(204,159,56,0.4)',
        boxShadow: '0 4px 14px rgba(74,47,24,0.28)',
        zIndex: '100', opacity: '0',
        transition: 'opacity 0.3s ease, transform 0.3s ease', whiteSpace: 'nowrap'
    });
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(function () {
        t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(function () { if (t.parentNode) t.remove(); }, 320);
    }, 2500);
}