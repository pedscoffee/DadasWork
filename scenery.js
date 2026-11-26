// ============================================================
// Scenery: shared little background details so every game feels
// like a place. All functions draw in whatever coordinates the
// game is already using (pass sizes in those units).
// Everything is deterministic (seeded), so nothing flickers.
//
//   Scenery.sky(ctx, x, y, w, h, top, bottom)
//   Scenery.sun(ctx, x, y, r, t)
//   Scenery.clouds(ctx, t, { x0, x1, y0, y1, n, size, speed, seed, color })
//   Scenery.hills(ctx, x0, x1, baseY, height, color, seed, bumps)
//   Scenery.mountains(ctx, x0, x1, baseY, height, color, seed, snow)
//   Scenery.trees(ctx, xs, baseY, size, { kind, snowy, seed })
//   Scenery.birds(ctx, t, { x0, x1, y, n, size, seed })
//   Scenery.flowers(ctx, x0, x1, y0, y1, n, size, seed)
//   Scenery.tufts(ctx, x0, x1, y, n, size, color, seed)
//   Scenery.skyline(ctx, x0, x1, baseY, height, color, seed)
// ============================================================
const Scenery = (() => {
    function rng(seed) {
        let s = (seed * 9301 + 49297) % 233280 || 1;
        return () => (s = (s * 9301 + 49297) % 233280) / 233280;
    }
    const api = {
        rng,
        sky(ctx, x, y, w, h, top = '#6ec6ff', bottom = '#d7f0ff') {
            const g = ctx.createLinearGradient(0, y, 0, y + h);
            g.addColorStop(0, top); g.addColorStop(1, bottom);
            ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        },
        sun(ctx, x, y, r, t = 0, color = '#ffd23f') {
            // soft glow + slowly turning rays
            const g = ctx.createRadialGradient(x, y, r * .6, x, y, r * 2.4);
            g.addColorStop(0, 'rgba(255,236,150,.55)'); g.addColorStop(1, 'rgba(255,236,150,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill();
            ctx.save(); ctx.translate(x, y); ctx.rotate(t * .15);
            ctx.strokeStyle = 'rgba(255,210,63,.55)'; ctx.lineWidth = r * .12; ctx.lineCap = 'round';
            for (let i = 0; i < 10; i++) {
                const a = i * Math.PI / 5;
                ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25); ctx.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); ctx.stroke();
            }
            ctx.restore();
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .35, 0, 7); ctx.fill();
        },
        cloud(ctx, x, y, k, color = 'rgba(255,255,255,.92)') {
            ctx.fillStyle = 'rgba(160,190,220,.25)';
            ctx.beginPath(); ctx.ellipse(x + k * .1, y + k * .55, k * 1.9, k * .32, 0, 0, 7); ctx.fill();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, k, 0, 7); ctx.arc(x + k * 1.05, y + k * .25, k * .78, 0, 7);
            ctx.arc(x - k * 1.0, y + k * .25, k * .7, 0, 7); ctx.arc(x + k * .45, y - k * .45, k * .7, 0, 7);
            ctx.fill();
        },
        clouds(ctx, t, o = {}) {
            const { x0 = 0, x1 = 1000, y0 = 30, y1 = 160, n = 4, size = 34, speed = 8, seed = 1, color } = o;
            const r = rng(seed), span = x1 - x0 + size * 6;
            for (let i = 0; i < n; i++) {
                const base = r() * span, y = y0 + r() * (y1 - y0), k = size * (.6 + r() * .7), sp = speed * (.6 + r() * .8);
                const x = x0 - size * 3 + ((base + t * sp) % span);
                api.cloud(ctx, x, y, k, color);
            }
        },
        hills(ctx, x0, x1, baseY, height, color, seed = 1, bumps = 3) {
            const r = rng(seed), ph = r() * 6, ph2 = r() * 6;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(x0, baseY + 2);
            const w = x1 - x0;
            for (let x = x0; x <= x1 + 10; x += 12) {
                const u = (x - x0) / w;
                ctx.lineTo(x, baseY - height * (.55 + .3 * Math.sin(u * Math.PI * bumps + ph) + .15 * Math.sin(u * Math.PI * bumps * 2.3 + ph2)));
            }
            ctx.lineTo(x1 + 10, baseY + 2); ctx.closePath(); ctx.fill();
        },
        mountains(ctx, x0, x1, baseY, height, color = '#9fb7d6', seed = 2, snow = true) {
            const r = rng(seed);
            let x = x0 - 60;
            while (x < x1 + 60) {
                const w = height * (1.4 + r() * 1.2), h = height * (.6 + r() * .4);
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x + w / 2, baseY - h); ctx.lineTo(x + w, baseY); ctx.fill();
                if (snow) {
                    ctx.fillStyle = 'rgba(255,255,255,.9)';
                    ctx.beginPath(); ctx.moveTo(x + w / 2, baseY - h); ctx.lineTo(x + w / 2 - w * .12, baseY - h * .76);
                    ctx.lineTo(x + w / 2 - w * .03, baseY - h * .8); ctx.lineTo(x + w / 2 + w * .05, baseY - h * .72); ctx.lineTo(x + w / 2 + w * .12, baseY - h * .76); ctx.fill();
                }
                x += w * (.55 + r() * .3);
            }
        },
        tree(ctx, x, baseY, size, kind = 'round', snowy = false, tone = 0) {
            if (kind === 'pine') {
                ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - size * .08, baseY - size * .3, size * .16, size * .3);
                ctx.fillStyle = tone ? '#2e7d32' : '#388e3c';
                for (let i = 0; i < 3; i++) {
                    const w = size * (.55 - i * .12), y = baseY - size * (.25 + i * .28);
                    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - size * .45); ctx.lineTo(x + w, y); ctx.fill();
                    if (snowy) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - w * .35, y - size * .3); ctx.lineTo(x, y - size * .45); ctx.lineTo(x + w * .35, y - size * .3); ctx.fill(); ctx.fillStyle = tone ? '#2e7d32' : '#388e3c'; }
                }
                return;
            }
            ctx.fillStyle = '#795548'; ctx.fillRect(x - size * .07, baseY - size * .5, size * .14, size * .5);
            const greens = snowy ? ['#e3f2fd', '#ffffff'] : tone ? ['#388e3c', '#43a047'] : ['#43a047', '#66bb6a'];
            ctx.fillStyle = greens[0];
            [[0, -.75, .36], [-.25, -.58, .27], [.25, -.58, .27]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * size, baseY + dy * size, rr * size, 0, 7); ctx.fill(); });
            ctx.fillStyle = greens[1];
            ctx.beginPath(); ctx.arc(x - size * .08, baseY - size * .85, size * .16, 0, 7); ctx.fill();
        },
        trees(ctx, xs, baseY, size, o = {}) {
            const r = rng(o.seed || 3);
            xs.forEach((x, i) => api.tree(ctx, x, baseY, size * (.8 + r() * .4), o.kind === 'mixed' ? (r() < .4 ? 'pine' : 'round') : (o.kind || 'round'), o.snowy, i % 2));
        },
        birds(ctx, t, o = {}) {
            const { x0 = 0, x1 = 1000, y = 90, n = 3, size = 10, seed = 4, color = '#37474f' } = o;
            const r = rng(seed), span = x1 - x0 + 200;
            ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, size * .22); ctx.lineCap = 'round';
            for (let i = 0; i < n; i++) {
                const off = r() * span, yy = y + (r() - .5) * size * 6, sp = 25 + r() * 20;
                const x = x0 - 100 + ((off + t * sp) % span);
                const flap = Math.sin(t * 8 + i * 2) * size * .45;
                ctx.beginPath();
                ctx.moveTo(x - size, yy - flap); ctx.quadraticCurveTo(x - size * .4, yy - size * .2, x, yy);
                ctx.quadraticCurveTo(x + size * .4, yy - size * .2, x + size, yy - flap);
                ctx.stroke();
            }
        },
        flowers(ctx, x0, x1, y0, y1, n, size = 6, seed = 5) {
            const r = rng(seed), cols = ['#ff6fae', '#ffd23f', '#ffffff', '#b388ff', '#ff8a65'];
            for (let i = 0; i < n; i++) {
                const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), c = cols[Math.floor(r() * cols.length)];
                ctx.strokeStyle = '#558b2f'; ctx.lineWidth = Math.max(1, size * .25);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + size * 1.6); ctx.stroke();
                ctx.fillStyle = c;
                for (let p = 0; p < 5; p++) { const a = p * 1.256; ctx.beginPath(); ctx.arc(x + Math.cos(a) * size * .55, y + Math.sin(a) * size * .55, size * .45, 0, 7); ctx.fill(); }
                ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.arc(x, y, size * .32, 0, 7); ctx.fill();
            }
        },
        tufts(ctx, x0, x1, y, n, size = 10, color = 'rgba(56,142,60,.7)', seed = 6) {
            const r = rng(seed);
            ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size * .18); ctx.lineCap = 'round';
            for (let i = 0; i < n; i++) {
                const x = x0 + r() * (x1 - x0), yy = y + r() * size * 2;
                ctx.beginPath();
                ctx.moveTo(x - size * .4, yy - size * .7); ctx.lineTo(x, yy);
                ctx.moveTo(x, yy - size); ctx.lineTo(x, yy);
                ctx.moveTo(x + size * .4, yy - size * .7); ctx.lineTo(x, yy);
                ctx.stroke();
            }
        },
        skyline(ctx, x0, x1, baseY, height, color = 'rgba(120,144,180,.55)', seed = 7) {
            const r = rng(seed);
            let x = x0;
            while (x < x1) {
                const w = height * (.25 + r() * .35), h = height * (.35 + r() * .65);
                ctx.fillStyle = color; ctx.fillRect(x, baseY - h, w, h);
                ctx.fillStyle = 'rgba(255,255,255,.35)';
                for (let wy = baseY - h + 8; wy < baseY - 10; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (r() < .55) ctx.fillRect(wx, wy, 5, 7);
                x += w + 4 + r() * 10;
            }
        }
    };
    return api;
})();
