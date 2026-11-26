// ============================================================
// Voice: one shared talking helper for the games.
//  - A sentence that is playing always gets to finish.
//  - If something new is said meanwhile, it waits its turn.
//    Only the newest waiting line is kept (no pile-ups from
//    fast tapping).
//  - Voice.say(text, { now: true }) interrupts on purpose.
// ============================================================
const Voice = (() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
    let current = 0, busyUntil = 0, pending = null, timer = null;

    function speak(text, rate) {
        const id = ++current;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = rate; u.pitch = 1.15;
        // Some iPads never fire onend, so also guess how long it takes
        busyUntil = Date.now() + 900 + text.length * 75 / rate;
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
        busy() { return Date.now() < busyUntil; }
    };
})();
