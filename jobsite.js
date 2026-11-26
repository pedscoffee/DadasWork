// ============================================================
// Dada's Work: the Construction Site chain.
// One building is saved (localStorage) and each machine game
// does one step of it. The Job Site hub (job-site.html) shows
// the building as it grows.
//
// A machine game is in "job mode" when its URL has ?job=1.
// When the kid finishes the step, the game calls
//   JobSite.complete('dig')   (or 'gravel', 'pour', 'stack')
// and shows JobSite.backButton() to return to the hub.
// ============================================================
const JobSite = (() => {
    const KEY = 'dadas-jobsite-v1';

    const BUILDINGS = [
        { id: 'house', emoji: '🏠', name: 'house', floors: 2, colors: ['#e63946', '#ffb703'], roof: 'triangle' },
        { id: 'firestation', emoji: '🚒', name: 'fire station', floors: 3, colors: ['#d62828', '#f1faee'], roof: 'flat' },
        { id: 'school', emoji: '🏫', name: 'school', floors: 3, colors: ['#e9c46a', '#2a9d8f'], roof: 'flat' },
        { id: 'castle', emoji: '🏰', name: 'castle', floors: 4, colors: ['#8d99ae', '#adb5bd'], roof: 'castle' },
        { id: 'library', emoji: '📚', name: 'library', floors: 2, colors: ['#457b9d', '#a8dadc'], roof: 'triangle' },
        { id: 'tower', emoji: '🗼', name: 'tall tower', floors: 6, colors: ['#9b5de5', '#f15bb5', '#00bbf9'], roof: 'triangle' }
    ];

    // The steps, in order. `file` null = done right on the hub page.
    const STEPS = [
        { id: 'dig', emoji: '🚜', machine: 'Excavator', job: 'Dig the hole', file: 'excavator.html?job=1' },
        { id: 'gravel', emoji: '🚚', machine: 'Dump Truck', job: 'Fill it with gravel', file: 'dump-truck.html?job=1' },
        { id: 'pour', emoji: '🛢️', machine: 'Cement Mixer', job: 'Pour the floor', file: 'cement-mixer.html?job=1' },
        { id: 'stack', emoji: '🏗️', machine: 'Crane', job: 'Stack the floors', file: 'crane.html?job=1' },
        { id: 'finish', emoji: '🎨', machine: 'Finish Crew', job: 'Windows, decorations and paint', file: 'finish-crew.html?job=1' },
        { id: 'ribbon', emoji: '✂️', machine: 'Ribbon', job: 'Cut the ribbon!', file: null }
    ];

    function fresh() { return { building: 0, step: 0, town: [], scribble: [], floors: [], shapes: [], decor: [] }; }

    function load() {
        try {
            const s = JSON.parse(localStorage.getItem(KEY));
            if (s && typeof s.step === 'number') return Object.assign(fresh(), s);
        } catch (e) { }
        return fresh();
    }
    function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }

    const api = {
        BUILDINGS, STEPS,
        load, save,
        inJob() { return new URLSearchParams(location.search).get('job') === '1'; },
        building(s = load()) { return BUILDINGS[s.building % BUILDINGS.length]; },
        stepIndex(id) { return STEPS.findIndex(x => x.id === id); },
        // Mark a step finished (only moves forward; replays don't skip ahead)
        complete(id, extra = {}) {
            const s = load();
            const i = api.stepIndex(id);
            Object.assign(s, extra);
            if (i >= s.step) s.step = i + 1;
            save(s);
            return s;
        },
        // Ribbon cut: add the building to town, start the next job
        finishBuilding() {
            const s = load();
            const b = api.building(s);
            s.town.push({ emoji: b.emoji, name: b.name });
            s.building = (s.building + 1) % BUILDINGS.length;
            s.step = 0; s.scribble = []; s.floors = []; s.shapes = []; s.decor = []; s.paint = [];
            save(s);
            return s;
        },
        reset() { save(fresh()); },

        // ---------- shared building drawing (hub + finish crew) ----------
        // Window spots: ground floor has 2 (the door is in the middle);
        // upper floors get 3, 2 or 1 depending on how tall the building is.
        windowSlots(n) {
            const per = n <= 2 ? 3 : n <= 3 ? 2 : 1;
            const out = [];
            for (let f = 0; f < n; f++) {
                const us = f === 0 ? [.18, .82] : per === 3 ? [.2, .5, .8] : per === 2 ? [.3, .7] : [.5];
                us.forEach(u => out.push({ u, f }));
            }
            return out;
        },
        shapePath(ctx, shape, cx, cy, r) {
            ctx.beginPath();
            if (shape === 'circle') ctx.arc(cx, cy, r, 0, Math.PI * 2);
            else if (shape === 'triangle') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 1.05, cy + r * .8); ctx.lineTo(cx - r * 1.05, cy + r * .8); ctx.closePath(); }
            else if (shape === 'star') {
                for (let i = 0; i < 10; i++) {
                    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r * 1.1;
                    i ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
                }
                ctx.closePath();
            } else if (shape === 'rectangle') ctx.rect(cx - r * .6, cy - r, r * 1.2, r * 2);
            else ctx.rect(cx - r * .85, cy - r * .85, r * 1.7, r * 1.7);   // square
        },
        // o: { x0, base (top of the slab), bw, fh, floors: [colors], roof, s (scale),
        //      windows: 'holes' | 'glass', filled: [bool per slot], shapes: [shape per slot],
        //      door: bool, decor: [{emoji, spot}] }
        drawBuilding(ctx, o) {
            const n = o.floors.length, s = o.s || 1;
            const slots = api.windowSlots(n);
            o.floors.forEach((col, i) => {
                const y = o.base - (i + 1) * o.fh;
                ctx.fillStyle = col; ctx.fillRect(o.x0, y, o.bw, o.fh);
                ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2 * s; ctx.strokeRect(o.x0, y, o.bw, o.fh);
            });
            // door
            const dw = o.bw * .17, dh = o.fh * .72, dx = o.x0 + o.bw / 2 - dw / 2, dy = o.base - dh;
            ctx.fillStyle = o.door ? '#6d4c41' : '#263238';
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(dx, dy, dw, dh, [8 * s, 8 * s, 0, 0]) : ctx.rect(dx, dy, dw, dh); ctx.fill();
            if (o.door) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(dx + dw * .78, dy + dh * .55, 3.5 * s, 0, 7); ctx.fill(); }
            // windows
            const r = Math.min(o.fh * .26, o.bw * .085);
            slots.forEach((sl, i) => {
                const cx = o.x0 + sl.u * o.bw, cy = o.base - (sl.f + .5) * o.fh;
                const shape = (o.shapes && o.shapes[i]) || 'square';
                const glass = o.windows === 'glass' || (o.filled && o.filled[i]);
                api.shapePath(ctx, shape, cx, cy, r);
                if (glass) {
                    ctx.fillStyle = '#bde0fe'; ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * s; ctx.stroke();
                } else {
                    ctx.fillStyle = '#263238'; ctx.fill();
                    if (o.outlines) { ctx.setLineDash([6 * s, 5 * s]); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3 * s; ctx.stroke(); ctx.setLineDash([]); }
                }
            });
            // roof
            const top = o.base - n * o.fh;
            ctx.fillStyle = '#6d4c41';
            if (o.roof === 'triangle') { ctx.beginPath(); ctx.moveTo(o.x0 - 16 * s, top); ctx.lineTo(o.x0 + o.bw / 2, top - o.fh * .9); ctx.lineTo(o.x0 + o.bw + 16 * s, top); ctx.fill(); }
            else if (o.roof === 'castle') { ctx.fillStyle = '#6c757d'; for (let k = 0; k < 5; k++) ctx.fillRect(o.x0 + k * o.bw / 4.5, top - o.fh * .35, o.bw / 9, o.fh * .35); }
            else ctx.fillRect(o.x0 - 8 * s, top - 10 * s, o.bw + 16 * s, 12 * s);
            // decorations
            (o.decor || []).forEach(d => {
                const p = api.spotXY(d.spot, o);
                ctx.font = `${p.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(d.emoji, p.x, p.y);
            });
            return { slots, r, top };
        },
        // Where a decoration sits (bottom-centre of the emoji)
        spotXY(spot, o) {
            const n = o.floors.length, top = o.base - n * o.fh, s = o.s || 1;
            const size = Math.max(20 * s, o.fh * .42);
            const roofH = o.roof === 'triangle' ? o.fh * .9 : o.roof === 'castle' ? o.fh * .35 : 10 * s;
            if (spot === 'top') return { x: o.x0 + o.bw / 2 + size * .2, y: top - roofH + 4 * s, size };
            if (spot === 'door') return { x: o.x0 + o.bw / 2 + o.bw * .15, y: o.base, size: size * .8 };
            if (spot === 'under') return { x: o.x0 + o.bw * .18, y: o.base, size: Math.min(size * .8, o.fh * .3) };
            if (spot === 'side') return { x: o.x0 - size * .7, y: o.base, size };
            if (spot === 'roofside') return { x: o.x0 + o.bw * .85, y: top - (o.roof === 'triangle' ? roofH * .25 : roofH) + 2 * s, size: size * .8 };
            return { x: o.x0 + o.bw + size * .7, y: o.base, size };   // 'right'
        },
        // A big "back to the job site" button for victory screens
        backButton(label = 'Back to the Job Site 🏗️') {
            const a = document.createElement('a');
            a.href = 'job-site.html';
            a.textContent = label;
            a.style.cssText = 'display:inline-block;margin:10px;padding:16px 36px;border-radius:40px;border:4px solid #fff;' +
                'background:linear-gradient(135deg,#ffb703,#fb8500);color:#fff;font:bold clamp(20px,4.5vw,30px) "Comic Sans MS","Chalkboard SE",sans-serif;' +
                'text-decoration:none;box-shadow:0 6px 0 #b55d00;';
            return a;
        },
        say(text) {
            try {
                if (!('speechSynthesis' in window)) return;
                speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                u.rate = 0.85; u.pitch = 1.15;
                speechSynthesis.speak(u);
            } catch (e) { }
        }
    };
    return api;
})();
