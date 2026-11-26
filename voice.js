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
// ============================================================
const Voice = (() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
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
            const v = chosen || pick();
            if (v && !u.voice) { u.voice = v; u.lang = v.lang; if (u.pitch > 1.1) u.pitch = 1.05; }
            orig(u);
        };
    }
    // Natural voices sound best near normal pitch; robotic ones get a little lift.
    const natural = () => chosen && /premium|enhanced|natural|neural|online|google/i.test(chosen.name);

    function speak(text, rate) {
        const id = ++current;
        const u = new SpeechSynthesisUtterance(text);
        const v = chosen || pick();
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = natural() ? Math.min(1, rate + .05) : rate;
        u.pitch = natural() ? 1.02 : 1.12;
        // Some iPads never fire onend, so also guess how long it takes
        busyUntil = Date.now() + 900 + text.length * 75 / u.rate;
        const done = () => {
            if (id !== current) return;
            busyUntil = 0;
            if (pending) { const p = pending; pending = null; speak(p.text, p.rate); }
        };
        u.onend = done; u.onerror = done;
        clearTimeout(timer);
        timer = setTimeout(done, busyUntil - Date.now() + 200);
        speechSynthesis.speak(u);
    }
    return {
        say(text, opts = {}) {
            if (!ok || !text) return;
            const rate = opts.rate || .85;
            try {
                if (opts.now || Date.now() > busyUntil) {
                    pending = null;
                    speechSynthesis.cancel();
                    speak(text, rate);
                } else {
                    pending = { text, rate };
                }
            } catch (e) { }
        },
        stop() { pending = null; busyUntil = 0; current++; try { speechSynthesis.cancel(); } catch (e) { } },
        busy() { return Date.now() < busyUntil; },
        // for voices.html
        list() { return ok ? speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a)) : []; },
        current() { return chosen || pick(); },
        choose(v) { try { v ? localStorage.setItem(KEY, v.voiceURI) : localStorage.removeItem(KEY); } catch (e) { } chosen = null; pick(); },
        score
    };
})();
