// ============================================================
// Kit: the bits every 1000x600 canvas game repeats.
//   Stage.init(canvas)  -> fits a 1000x600 world to the screen
//   Stage.toWorld(evt)  -> pointer position in world units
//   Stage.vx0/vx1/vy0/vy1 -> what part of the world is visible
//   tone(freq, dur, type, vol, slideTo, delay)
//   rain([emoji...], n) -> celebration emoji shower
//   rr(ctx, x, y, w, h, r), emoji(ctx, e, x, y, size, baseline),
//   label(ctx, text, x, y, size, fill, stroke)
// ============================================================
const Stage = {
    VW: 1000, VH: 600, k: 1, ox: 0, oy: 0, W: 0, H: 0, vx0: 0, vx1: 1000, vy0: 0, vy1: 600, ctx: null, canvas: null,
    init(canvas) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        const fit = () => {
            const DPR = Math.min(devicePixelRatio || 1, 2);
            this.W = innerWidth; this.H = innerHeight;
            canvas.width = this.W * DPR; canvas.height = this.H * DPR;
            this.k = Math.min(this.W / this.VW, this.H / this.VH);
            this.ox = (this.W - this.VW * this.k) / 2; this.oy = (this.H - this.VH * this.k) / 2;
            this.vx0 = -this.ox / this.k; this.vx1 = (this.W - this.ox) / this.k;
            this.vy0 = -this.oy / this.k; this.vy1 = (this.H - this.oy) / this.k;
            this.DPR = DPR;
        };
        addEventListener('resize', fit); fit();
        return this.ctx;
    },
    // call at the start of each frame; draws in world units afterwards
    begin() { const c = this.ctx; c.setTransform(this.DPR * this.k, 0, 0, this.DPR * this.k, this.DPR * this.ox, this.DPR * this.oy); return c; },
    toWorld(e) { return { x: (e.clientX - this.ox) / this.k, y: (e.clientY - this.oy) / this.k }; }
};

let _AC = null;
function tone(f, d = .15, type = 'triangle', v = .18, slideTo, delay = 0) {
    try {
        _AC = _AC || new (window.AudioContext || window.webkitAudioContext)();
        if (_AC.state === 'suspended') _AC.resume();
        const n = _AC.currentTime + delay, o = _AC.createOscillator(), g = _AC.createGain();
        o.type = type; o.frequency.setValueAtTime(f, n);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, n + d);
        g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.001, n + d);
        o.connect(g).connect(_AC.destination); o.start(n); o.stop(n + d);
    } catch (e) { }
}
const ding = () => { tone(988, .12); tone(1319, .2, 'triangle', .18, null, .08); };
const fanfare = () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, .3, 'triangle', .18, null, i * .13));
const boing = () => tone(520, .35, 'sine', .2, 150);
function splash() {
    try {
        _AC = _AC || new (window.AudioContext || window.webkitAudioContext)();
        const n = _AC.sampleRate * .45, buf = _AC.createBuffer(1, n, _AC.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
        const s = _AC.createBufferSource(), f = _AC.createBiquadFilter(), g = _AC.createGain();
        f.type = 'bandpass'; f.frequency.value = 900; g.gain.value = .5;
        s.buffer = buf; s.connect(f).connect(g).connect(_AC.destination); s.start();
    } catch (e) { }
}
function rain(emojis, n = 30) {
    for (let i = 0; i < n; i++) setTimeout(() => {
        const e = document.createElement('div');
        e.className = 'rain'; e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        e.style.left = Math.random() * 95 + 'vw'; e.style.animationDuration = (2 + Math.random() * 2) + 's';
        document.body.appendChild(e); setTimeout(() => e.remove(), 4200);
    }, i * 60);
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function emoji(ctx, e, x, y, size, base = 'middle') {
    ctx.fillStyle = '#000'; ctx.font = `${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = base; ctx.fillText(e, x, y);
}
function label(ctx, text, x, y, size, fill = '#1c5d99', stroke = '#fff') {
    ctx.font = `bold ${size}px 'Arial Rounded MT Bold', Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = size * .18; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const say = (text, now = false) => Voice.say(text, { now });
function navMenu() {
    document.getElementById('nav-toggle').addEventListener('click', () => document.getElementById('nav-overlay').classList.remove('hidden'));
    document.getElementById('nav-close').addEventListener('click', () => document.getElementById('nav-overlay').classList.add('hidden'));
}
