// ============================================================
// Dada's Work: the ONE list of games.
// Every page's game menu is built from this list, so adding a
// new game means adding one line here (plus the game's .html).
// ============================================================
const DADAS_GAMES = [
    { file: 'index.html', emoji: '⌨️', name: 'Magic Typing' },
    { file: 'submarine.html', emoji: '🌊', name: 'Submarine' },
    { file: 'excavator.html', emoji: '🚜', name: 'Excavator' },
    { file: 'christmas-tree.html', emoji: '🎄', name: 'Christmas Tree' },
    { file: 'firetruck.html', emoji: '🚒', name: 'Fire Truck' },
    { file: 'drive.html', emoji: '🚗', name: 'Drive & Collect' },
    { file: 'racer.html', emoji: '🏎️', name: 'Racer' },
    { file: 'town-racer.html', emoji: '🏙️', name: 'Town Adventure' },
    { file: 'santa-delivery.html', emoji: '🎅', name: 'Santa Delivery' },
    { file: 'snowball-throw.html', emoji: '❄️', name: 'Snowball Throw' }
];

(function buildGameMenus() {
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    function fill() {
        // Hamburger overlay menus used by most games
        document.querySelectorAll('.nav-links').forEach(list => {
            list.innerHTML = '';
            DADAS_GAMES.forEach(g => {
                const a = document.createElement('a');
                a.href = g.file;
                a.textContent = `${g.emoji} ${g.name}`;
                if (g.file === here) a.setAttribute('aria-current', 'page');
                list.appendChild(a);
            });
        });

        // Dropdown menu on Magic Typing
        const dropdown = document.getElementById('game-menu-dropdown');
        if (dropdown) {
            dropdown.innerHTML = '';
            DADAS_GAMES.forEach(g => {
                const a = document.createElement('a');
                a.href = g.file;
                a.className = 'menu-item';
                if (g.file === here) a.setAttribute('aria-current', 'page');
                a.innerHTML = `<span class="menu-emoji">${g.emoji}</span><span class="menu-label">${g.name}</span>`;
                dropdown.appendChild(a);
            });
        }

        // Styles: current-game highlight + the Magic Typing pop-up menu
        const style = document.createElement('style');
        style.textContent = `
            .nav-links a[aria-current="page"], #game-menu-dropdown a[aria-current="page"] { outline: 3px solid #FFD700; }
            #game-menu-container { position: fixed; bottom: 10px; left: 10px; z-index: 40; }
            #game-menu-container #menu-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 16px; padding: 10px 16px; }
            #game-menu-dropdown { position: absolute; bottom: calc(100% + 8px); left: 0; min-width: 210px;
                max-height: 70vh; overflow-y: auto; background: rgba(20, 20, 35, 0.96); border-radius: 16px;
                padding: 8px; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 8px 30px rgba(0,0,0,0.5);
                transform-origin: bottom left; transition: transform .2s ease, opacity .2s ease; }
            #game-menu-dropdown.hidden { opacity: 0; transform: scale(0.85); pointer-events: none; }
            #game-menu-dropdown .menu-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px;
                color: #fff; text-decoration: none; border-radius: 10px; font: 600 16px -apple-system, 'Segoe UI', sans-serif; }
            #game-menu-dropdown .menu-item:hover, #game-menu-dropdown .menu-item:active { background: rgba(255,255,255,0.15); }
            #game-menu-dropdown .menu-emoji { font-size: 24px; width: 28px; text-align: center; }
        `;
        document.head.appendChild(style);

        const toggle = document.getElementById('menu-toggle');
        if (toggle && dropdown) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            document.addEventListener('pointerdown', (e) => {
                if (!dropdown.contains(e.target) && !toggle.contains(e.target)) dropdown.classList.add('hidden');
            });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
    else fill();
})();
