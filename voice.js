// ============================================================
// Voice: one shared talking helper for the games.
//  - Uses the most natural English voice on the device
//    (Premium / Enhanced / Natural voices first), or the one picked
//    on voices.html (saved on this device).
//  - A sentence that is playing always gets to finish. Anything said
//    meanwhile waits its turn; only the newest waiting line is kept.
//  - Voice.say(text, { now: true }) interrupts on purpose.
//  - Including this file also upgrades older games that talk to the
//    browser directly: their speech gets the chosen voice too.
//  - Recorded clips (voice/script.js + voice/clips.js): if every piece
//    of a sentence has a recording ("Find the word" + "cat"), the
//    recordings play instead of the device voice. If any piece is
//    missing, the whole sentence uses the device voice (no mixing).
// ============================================================

// ---- Turning a sentence into pieces (shared with tools/voice-coverage.js) ----
const VoiceText = (() => {
    const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
        'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    function numberWords(n) {
        if (n < 20) return [ONES[n]];
        if (n === 100) return ['one', 'hundred'];
        if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], ONES[n % 10]] : [TENS[n / 10]];
        return String(n).split('').map(d => ONES[+d]);
    }
    // Tokens: lowercase words, "L:B" for a letter name, "," for a short pause, "." for a sentence end.
    function tokenize(text) {
        const out = [];
        const s = String(text).replace(/…|\.\.\./g, ' , ').replace(/[—–]/g, ' , ');
        const re = /[A-Za-z0-9']+|[,.!?:;]/g;
        let m;
        while ((m = re.exec(s))) {
            const w = m[0];
            if (/^[,:;]$/.test(w)) { out.push(','); continue; }
            if (/^[.!?]$/.test(w)) { out.push('.'); continue; }
            if (/^\d+$/.test(w)) { numberWords(+w).forEach(x => out.push(x)); continue; }
            if (/^[A-Z]$/.test(w)) {
                // "A" and "I" followed by a word are just the words a / I
                const nextChar = s.slice(re.lastIndex).match(/^\s*(\S)/);
                const prev = out[out.length - 1];
                if ((w === 'A' || w === 'I') && nextChar && /[A-Za-z]/.test(nextChar[1]) && !['the', 'little', 'big', 'letter'].includes(prev)) { out.push(w.toLowerCase()); continue; }
                out.push('L:' + w); continue;
            }
            out.push(w.toLowerCase().replace(/'/g, ''));
        }
        // collapse repeated pauses; drop leading/trailing pauses
        const res = [];
        out.forEach(t => {
            if ((t === ',' || t === '.') && (!res.length || res[res.length - 1] === ',' || res[res.length - 1] === '.')) {
                if (res.length && t === '.') res[res.length - 1] = '.';
                return;
            }
            res.push(t);
        });
        while (res.length && (res[res.length - 1] === ',' || res[res.length - 1] === '.')) res.pop();
        return res;
    }
    const key = (text) => tokenize(text).join(' ');
    // Cover the tokens with the longest recorded pieces. dict: key -> id. Returns [{id}|{pause}] or null.
    function segment(text, dict, maxLen = 14) {
        const toks = tokenize(text), out = [];
        let i = 0;
        while (i < toks.length) {
            const t = toks[i];
            let found = null;
            for (let n = Math.min(maxLen, toks.length - i); n >= 1; n--) {
                const k = toks.slice(i, i + n).join(' ');
                if (dict[k]) { found = { id: dict[k], n }; break; }
            }
            if (found) { out.push({ id: found.id }); i += found.n; continue; }
            if (t === ',' || t === '.') { out.push({ pause: t === '.' ? 260 : 130 }); i++; continue; }
            return null;
        }
        return out;
    }
    return { tokenize, key, segment, numberWords };
})();
if (typeof module !== 'undefined') module.exports = { VoiceText };
const Voice = (() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // ---------- recorded clips ----------
    const base = (typeof document !== 'undefined' && document.currentScript) ? document.currentScript.src.replace(/[^/]*$/, '') : '';
    const Clips = { dict: null, files: {}, buffers: {}, ac: null, playing: [] };
    function loadScriptTag(src) {
        return new Promise(res => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = res; document.head.appendChild(el); });
    }
    if (typeof document !== 'undefined') {
        Promise.all([loadScriptTag(base + 'voice/script.js'), loadScriptTag(base + 'voice/clips.js')]).then(() => {
            const script = window.VOICE_SCRIPT || [], clips = window.VOICE_CLIPS || {};
            const dict = {};
            script.forEach(l => { if (clips[l.id]) dict[VoiceText.key(l.say || l.text)] = l.id; });
            Clips.files = clips;
            Clips.dict = Object.keys(dict).length ? dict : null;
        });
        // audio has to be unlocked by a tap on iPad/iPhone
        const unlock = () => { try { Clips.ac = Clips.ac || new (window.AudioContext || window.webkitAudioContext)(); if (Clips.ac.state === 'suspended') Clips.ac.resume(); } catch (e) { } };
        addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
    }
    function buffer(id) {
        if (!Clips.buffers[id]) {
            Clips.buffers[id] = fetch(base + 'voice/clips/' + Clips.files[id])
                .then(r => { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
                .then(b => new Promise((res, rej) => Clips.ac.decodeAudioData(b, res, rej)));
            Clips.buffers[id].catch(() => { delete Clips.buffers[id]; });
        }
        return Clips.buffers[id];
    }
    function stopClips() { Clips.playing.forEach(s => { try { s.stop(); } catch (e) { } }); Clips.playing = []; }
    // Try to say it with recordings. Calls back with true if it played, false to fall back.
    function playClips(text, id, onDone) {
        if (!Clips.dict || !Clips.ac) return false;
        const plan = VoiceText.segment(text, Clips.dict);
        if (!plan) return false;
        Promise.all(plan.filter(p => p.id).map(p => buffer(p.id))).then(() => {
            if (id !== current) return;
            const ac = Clips.ac;
            // every buffer is ready; schedule them back to back
            Promise.all(plan.map(p => p.id ? Clips.buffers[p.id] : null)).then(list => {
                if (id !== current) return;
                let tt = ac.currentTime + .03, last = null;
                list.forEach((b, i) => {
                    if (!b) { tt += plan[i].pause / 1000; return; }
                    const src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(tt);
                    Clips.playing.push(src); tt += b.duration + .06; last = src;
                });
                busyUntil = Date.now() + (tt - ac.currentTime) * 1000 + 100;
                clearTimeout(timer);
                timer = setTimeout(onDone, (tt - ac.currentTime) * 1000 + 150);
            });
        }).catch(() => { if (id === current) { busyUntil = 0; ttsSpeak(text, .85, id); } });
        return true;
    }
    const KEY = 'dadas-voice';
    let current = 0, busyUntil = 0, pending = null, timer = null, chosen = null;

    // Novelty / joke voices on Apple devices we never want
    const SILLY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|ralph|fred|junior|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i;
    function score(v) {
        let s = 0;
        const n = v.name.toLowerCase();
        if (!/^en/i.test(v.lang)) return -1000;
        if (/en[-_]us/i.test(v.lang)) s += 20;
        else if (/en[-_](gb|au|ca|ie|nz)/i.test(v.lang)) s += 12;
        if (SILLY.test(v.name)) s -= 500;
        if (/premium/.test(n)) s += 60;
        if (/enhanced/.test(n)) s += 50;
        if (/natural|neural|online/.test(n)) s += 55;          // Edge's Microsoft "Natural" voices
        if (/google us english|google uk english female/.test(n)) s += 35;
        if (/\b(ava|zoe|samantha|allison|susan|nicky|evan|nathan|joelle|noelle|aria|jenny|ana|emma)\b/.test(n)) s += 15;
        if (v.default) s += 3;
        return s;
    }
    function pick() {
        if (!ok) return null;
        const voices = speechSynthesis.getVoices();
        if (!voices.length) return null;
        let saved = null;
        try { saved = localStorage.getItem(KEY); } catch (e) { }
        if (saved) { const v = voices.find(v => v.voiceURI === saved || v.name === saved); if (v) return (chosen = v); }
        return (chosen = voices.slice().sort((a, b) => score(b) - score(a))[0] || null);
    }
    if (ok) {
        pick();
        speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', pick) : (speechSynthesis.onvoiceschanged = pick);
        // Older games call speechSynthesis.speak() themselves: give them the good voice too.
        const orig = speechSynthesis.speak.bind(speechSynthesis);
        speechSynthesis.speak = (u) => {
            // an older game talking directly: use the recordings if we have them all
            if (!u.__voice && Clips.dict && VoiceText.segment(u.text, Clips.dict)) { api.say(u.text, { now: true }); return; }
            const v = chosen || pick();
            if (v && !u.voice) { u.voice = v; u.lang = v.lang; if (u.pitch > 1.1) u.pitch = 1.05; }
            orig(u);
        };
    }
    // Natural voices sound best near normal pitch; robotic ones get a little lift.
    const natural = () => chosen && /premium|enhanced|natural|neural|online|google/i.test(chosen.name);

    function speak(text, rate) {
        const id = ++current;
        stopClips();
        const done = () => {
            if (id !== current) return;
            busyUntil = 0;
            if (pending) { const p = pending; pending = null; speak(p.text, p.rate); }
        };
        busyUntil = Date.now() + 900 + text.length * 75 / rate;   // until we know better
        if (playClips(text, id, done)) return;
        ttsSpeak(text, rate, id, done);
    }
    function ttsSpeak(text, rate, id, doneCb) {
        if (!ok) return;
        const u = new SpeechSynthesisUtterance(text);
        u.__voice = true;
        const v = chosen || pick();
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = natural() ? Math.min(1, rate + .05) : rate;
        u.pitch = natural() ? 1.02 : 1.12;
        // Some iPads never fire onend, so also guess how long it takes
        busyUntil = Date.now() + 900 + text.length * 75 / u.rate;
        const done = doneCb || (() => { if (id === current) busyUntil = 0; });
        u.onend = done; u.onerror = done;
        clearTimeout(timer);
        timer = setTimeout(done, busyUntil - Date.now() + 200);
        speechSynthesis.speak(u);
    }
    const api = {
        say(text, opts = {}) {
            if ((!ok && !Clips.dict) || !text) return;
            const rate = opts.rate || .85;
            try {
                if (opts.now || Date.now() > busyUntil) {
                    pending = null;
                    if (ok) speechSynthesis.cancel();
                    speak(text, rate);
                } else {
                    pending = { text, rate };
                }
            } catch (e) { }
        },
        stop() { pending = null; busyUntil = 0; current++; stopClips(); try { speechSynthesis.cancel(); } catch (e) { } },
        hasClips() { return !!Clips.dict; },
        busy() { return Date.now() < busyUntil; },
        // for voices.html
        list() { return ok ? speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a)) : []; },
        current() { return chosen || pick(); },
        choose(v) { try { v ? localStorage.setItem(KEY, v.voiceURI) : localStorage.removeItem(KEY); } catch (e) { } chosen = null; pick(); },
        score
    };
    return api;
})();
