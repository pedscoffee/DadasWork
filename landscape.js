// ============================================================
// For the wide (landscape) games: on a phone held upright, ask to
// turn it sideways instead of showing a tiny strip of game.
// Goes away by itself as soon as the phone is turned.
// Include with <script src="landscape.js"></script>.
// ============================================================
(() => {
    let dismissed = false;
    const el = document.createElement('div');
    el.id = 'turn-sideways';
    el.innerHTML = `
        <div class="ts-phone">📱</div>
        <div class="ts-text">Turn me sideways!</div>
        <button class="ts-skip">play anyway</button>`;
    const css = document.createElement('style');
    css.textContent = `
        #turn-sideways { position: fixed; inset: 0; z-index: 5000; display: none; flex-direction: column; align-items: center;
            justify-content: center; gap: 24px; text-align: center;
            background: linear-gradient(180deg, #6ec6ff, #d7f0ff);
            font-family: 'Arial Rounded MT Bold', 'Chalkboard SE', 'Comic Sans MS', sans-serif; }
        #turn-sideways.show { display: flex; }
        #turn-sideways .ts-phone { font-size: 120px; animation: ts-turn 2s ease-in-out infinite; }
        #turn-sideways .ts-text { font-size: 34px; color: #fff; text-shadow: 0 3px 0 #1c5d99; padding: 0 20px; }
        #turn-sideways .ts-skip { margin-top: 30px; background: none; border: none; color: #1c5d99; font: inherit; font-size: 15px;
            text-decoration: underline; opacity: .7; cursor: pointer; }
        @keyframes ts-turn { 0%, 20% { transform: rotate(0); } 50%, 80% { transform: rotate(-90deg); } 100% { transform: rotate(0); } }`;
    function check() {
        const phoneUpright = window.innerHeight > window.innerWidth * 1.15 && Math.min(window.innerWidth, window.innerHeight) < 600;
        el.classList.toggle('show', phoneUpright && !dismissed);
    }
    function init() {
        document.head.appendChild(css);
        document.body.appendChild(el);
        el.querySelector('.ts-skip').addEventListener('click', () => { dismissed = true; check(); });
        addEventListener('resize', check);
        addEventListener('orientationchange', () => setTimeout(check, 200));
        check();
    }
    if (document.body) init(); else addEventListener('DOMContentLoaded', init);
})();
